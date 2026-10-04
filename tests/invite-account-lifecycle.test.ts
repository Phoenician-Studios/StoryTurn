import { beforeEach, expect, it, vi } from "vitest";
import {
  createFamilyAction,
  loginAction,
  logoutAction,
  switchDemoUserAction,
} from "@/app/actions";

const mocks = vi.hoisted(() => ({
  deleteCookie: vi.fn(),
  demoLogin: vi.fn(),
  demoLogout: vi.fn(),
  signOut: vi.fn(),
  isDemoMode: vi.fn(() => true),
  createFamily: vi.fn(),
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ delete: mocks.deleteCookie }),
}));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/config", () => ({ isDemoMode: mocks.isDemoMode }));
vi.mock("@/lib/demo/store", () => ({
  demoLogin: mocks.demoLogin,
  demoLogout: mocks.demoLogout,
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { signOut: mocks.signOut } }),
}));
vi.mock("@/lib/data", () => ({ createFamily: mocks.createFamily }));
beforeEach(() => mocks.isDemoMode.mockReturnValue(true));

it.each([true, false])("clears pending invites on sign-out (demo: %s)", async (demo) => {
  mocks.isDemoMode.mockReturnValue(demo);
  await expect(logoutAction()).rejects.toThrow("redirect:/login");
  expect(mocks.deleteCookie).toHaveBeenCalledWith("storyturn-invite");
  expect(demo ? mocks.demoLogout : mocks.signOut).toHaveBeenCalledOnce();
});
it("clears pending invites when switching demo accounts", async () => {
  await expect(switchDemoUserAction(new FormData())).rejects.toThrow("redirect:/");
  expect(mocks.deleteCookie).toHaveBeenCalledWith("storyturn-invite");
});
it("preserves a new recipient's invite during sign-in", async () => {
  const form = new FormData();
  form.set("email", "reader@example.com");
  await expect(loginAction(form)).rejects.toThrow("redirect:/");
  expect(mocks.deleteCookie).not.toHaveBeenCalled();
});
it("clears unused invites after creating a family", async () => {
  await expect(createFamilyAction(new FormData())).rejects.toThrow("redirect:/");
  expect(mocks.deleteCookie).toHaveBeenCalledWith("storyturn-invite");
});
