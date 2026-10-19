import { beforeEach, expect, it, vi } from "vitest";
import { updateMemberAction } from "@/app/actions";

const mocks = vi.hoisted(() => ({
  updateMember: vi.fn(),
  updateMemberRelation: vi.fn(),
}));
vi.mock("next/headers", () => ({ cookies: async () => ({}) }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/data", () => ({
  updateMember: mocks.updateMember,
  updateMemberRelation: mocks.updateMemberRelation,
}));

function memberForm(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

beforeEach(() => vi.clearAllMocks());

it("saves name, access, and relation from one reader form", async () => {
  await updateMemberAction(
    memberForm({
      id: "mem_nana",
      name: "Nana",
      role: "reader",
      relationToChildren: "caregiver",
    }),
  );
  expect(mocks.updateMember).toHaveBeenCalledWith("mem_nana", "Nana", "reader");
  expect(mocks.updateMemberRelation).toHaveBeenCalledWith("mem_nana", "caregiver");
});

it("leaves the relation alone when the form omits it", async () => {
  await updateMemberAction(memberForm({ id: "mem_nana", name: "Nana", role: "reader" }));
  expect(mocks.updateMember).toHaveBeenCalledOnce();
  expect(mocks.updateMemberRelation).not.toHaveBeenCalled();
});

it("does not save the relation when the reader update fails", async () => {
  mocks.updateMember.mockRejectedValueOnce(new Error("Cannot change your own role"));
  await expect(
    updateMemberAction(
      memberForm({
        id: "mem_alex",
        name: "Alex",
        role: "reader",
        relationToChildren: "parent",
      }),
    ),
  ).rejects.toThrow(/own role/);
  expect(mocks.updateMemberRelation).not.toHaveBeenCalled();
});
