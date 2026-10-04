import { expect, it, vi } from "vitest";
import { GET } from "@/app/join/route";
import { getCurrentUser } from "@/lib/data";
vi.mock("@/lib/data", () => ({ getCurrentUser: vi.fn() }));
it("retains the invite through sign-in without joining automatically", async () => {
  vi.mocked(getCurrentUser).mockResolvedValue(null);
  const response = await GET(new Request("https://www.storyturn.app/join?code=family24"));
  expect(response.headers.get("location")).toBe("https://www.storyturn.app/login");
  expect(response.cookies.get("storyturn-invite")?.value).toBe("FAMILY24");
  expect(response.headers.get("set-cookie")).toContain("HttpOnly");
});
it("takes signed-in recipients to onboarding", async () => {
  vi.mocked(getCurrentUser).mockResolvedValue({
    id: "user",
    email: "reader@example.com",
    displayName: "Reader",
    passwordHash: null,
    createdAt: "2026-10-04",
  });
  const response = await GET(new Request("https://www.storyturn.app/join?code=FAMILY24"));
  expect(response.headers.get("location")).toBe("https://www.storyturn.app/onboarding");
});
