import { beforeEach, expect, it, vi } from "vitest";
import {
  createFamilyAction,
  loginAction,
  logoutAction,
  switchDemoUserAction,
} from "@/app/actions";

const mocks = vi.hoisted(() => ({
  deleteCookie: vi.fn(),
  setCookie: vi.fn(),
  getCookie: vi.fn(),
  demoLogin: vi.fn(() => ({ id: "user_1" })),
  demoLogout: vi.fn(),
  createFamilyDemo: vi.fn(),
  signOut: vi.fn(),
  isDemoMode: vi.fn(() => true),
  createFamily: vi.fn(),
  getCurrentMember: vi.fn(() => ({ id: "mem_1" })),
  acceptPendingInvite: vi.fn(async () => ({ status: "none" as const })),
  clearPendingInvite: vi.fn(),
  setPendingInvite: vi.fn(),
  setDemoSessionUserId: vi.fn(),
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    delete: mocks.deleteCookie,
    set: mocks.setCookie,
    get: mocks.getCookie,
  }),
}));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/config", () => ({ isDemoMode: mocks.isDemoMode, appUrl: () => "" }));
vi.mock("@/lib/demo/store", () => ({
  demoLogin: mocks.demoLogin,
  demoLogout: mocks.demoLogout,
  createFamily: mocks.createFamilyDemo,
  setDemoSessionUserId: mocks.setDemoSessionUserId,
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { signOut: mocks.signOut } }),
}));
vi.mock("@/lib/data", () => ({
  createFamily: mocks.createFamily,
  getCurrentMember: mocks.getCurrentMember,
}));
vi.mock("@/lib/accept-pending-invite", () => ({
  acceptPendingInviteForCurrentUser: mocks.acceptPendingInvite,
}));
vi.mock("@/lib/pending-invite", () => ({
  clearPendingInvite: mocks.clearPendingInvite,
  setPendingInvite: mocks.setPendingInvite,
}));
beforeEach(() => {
  mocks.isDemoMode.mockReturnValue(true);
  mocks.getCurrentMember.mockResolvedValue({ id: "mem_1" });
  mocks.acceptPendingInvite.mockResolvedValue({ status: "none" });
});

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
  expect(mocks.deleteCookie).not.toHaveBeenCalledWith("storyturn-invite");
});
it("clears unused invites after creating a family", async () => {
  await expect(createFamilyAction(new FormData())).rejects.toThrow("redirect:/");
  expect(mocks.deleteCookie).toHaveBeenCalledWith("storyturn-invite");
});
