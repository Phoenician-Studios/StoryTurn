import { expect, it, vi } from "vitest";
import { GET } from "@/app/join/route";
import { getCurrentMember, getCurrentUser } from "@/lib/data";
vi.mock("@/lib/data", () => ({ getCurrentUser: vi.fn(), getCurrentMember: vi.fn() }));
it("retains the invite through sign-in without joining automatically", async () => {
  vi.mocked(getCurrentUser).mockResolvedValue(null);
  const response = await GET(new Request("https://www.storyturn.app/join?code=family24"));
  expect(response.headers.get("location")).toBe("https://www.storyturn.app/login");
  expect(response.cookies.get("storyturn-invite")?.value).toBe("FAMILY24");
  expect(response.headers.get("set-cookie")).toContain("HttpOnly");
});
it("takes signed-in recipients to onboarding", async () => {
  vi.mocked(getCurrentMember).mockResolvedValue(null);
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

it("explains why existing members cannot join and clears the pending invite", async () => {
  vi.mocked(getCurrentUser).mockResolvedValue({
    id: "user",
    email: "reader@example.com",
    displayName: "Reader",
    passwordHash: null,
    createdAt: "2026-10-04",
  });
  vi.mocked(getCurrentMember).mockResolvedValue({
    id: "member",
    familyId: "family",
    userId: "user",
    email: "reader@example.com",
    displayName: "Reader",
    role: "reader",
    createdAt: "2026-10-04",
  });
  const response = await GET(new Request("https://www.storyturn.app/join?code=FAMILY24"));
  expect(response.headers.get("location")).toBe(
    "https://www.storyturn.app/family?invite=already-member",
  );
  expect(response.cookies.get("storyturn-invite")?.value).toBe("");
  expect(response.headers.get("set-cookie")).toContain("Expires=Thu, 01 Jan 1970");
});
