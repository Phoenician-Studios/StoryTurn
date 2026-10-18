"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { acceptPendingInviteForCurrentUser } from "@/lib/accept-pending-invite";
import {
  addBookFromSearch,
  addKid,
  cancelSession,
  createFamily,
  createInviteCode,
  demoLogin,
  demoLogout,
  getCurrentMember,
  joinFamily,
  saveSchedule,
  updateSession,
} from "@/lib/demo/store";
import {
  clearDemoSessionCookie,
  setDemoSessionCookie,
} from "@/lib/demo-session";
import { clearPendingInvite, setPendingInvite } from "@/lib/pending-invite";
import { searchOpenLibrary } from "@/lib/open-library";
import { isDemoMode } from "@/lib/config";

function ensureDemo(): void {
  if (!isDemoMode()) {
    // Supabase-backed path lands in a follow-up once credentials exist.
    // Until then every environment uses the demo store.
  }
}

export async function loginAction(formData: FormData) {
  ensureDemo();
  const email = String(formData.get("email") ?? "");
  if (!email.includes("@")) {
    throw new Error("Enter a valid email");
  }
  const inviteFromForm = String(formData.get("invite") ?? "").trim();
  if (inviteFromForm) {
    await setPendingInvite(inviteFromForm);
  }
  const user = demoLogin(email);
  await setDemoSessionCookie(user.id);
  const accepted = await acceptPendingInviteForCurrentUser();
  revalidatePath("/");
  if (getCurrentMember()) {
    redirect(accepted.status === "joined" ? "/invite/consumed" : "/");
  }
  redirect("/onboarding");
}

export async function logoutAction() {
  demoLogout();
  await clearDemoSessionCookie();
  redirect("/login");
}

export async function createFamilyAction(formData: FormData) {
  createFamily(String(formData.get("name") ?? "Our family"));
  revalidatePath("/");
  redirect("/");
}

export async function joinFamilyAction(formData: FormData) {
  joinFamily(String(formData.get("code") ?? ""));
  await clearPendingInvite();
  revalidatePath("/");
  redirect("/");
}

export async function addKidAction(formData: FormData) {
  addKid(String(formData.get("name") ?? ""), Number(formData.get("age") ?? 0));
  revalidatePath("/kids");
  revalidatePath("/family");
}

export async function createInviteAction() {
  const code = createInviteCode();
  revalidatePath("/family");
  return { code };
}

export async function saveScheduleAction(formData: FormData) {
  const readers = formData.getAll("readers").map(String);
  saveSchedule({
    readerRotationMemberIds: readers,
    startDate: String(formData.get("startDate")),
    timeLocal: String(formData.get("timeLocal")),
    timezone: String(formData.get("timezone") || "America/Los_Angeles"),
    bookTiming: String(formData.get("bookTiming")) === "ahead" ? "ahead" : "after",
  });
  revalidatePath("/schedule");
  revalidatePath("/");
}

export async function searchBooksAction(query: string) {
  return searchOpenLibrary(query, { limit: 8 });
}

export async function addBookAction(formData: FormData) {
  addBookFromSearch({
    title: String(formData.get("title")),
    authors: String(formData.get("authors") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    openLibraryKey: String(formData.get("openLibraryKey") || "") || null,
    coverUrl: String(formData.get("coverUrl") || "") || null,
    isbn: String(formData.get("isbn") || "") || null,
  });
  revalidatePath("/library");
}

export async function cancelSessionAction(sessionId: string) {
  await cancelSession(sessionId);
  revalidatePath("/");
  revalidatePath(`/sessions/${sessionId}`);
  revalidatePath("/dashboard");
}

export async function updateSessionAction(formData: FormData) {
  const sessionId = String(formData.get("sessionId"));
  await updateSession({
    sessionId,
    memberIds: formData.getAll("memberIds").map(String),
    bookIds: formData.getAll("bookIds").map(String),
    freeformTitles: String(formData.get("freeformTitles") ?? "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
    notes: String(formData.get("notes") || "") || null,
    status: String(formData.get("status")) as "scheduled" | "completed" | "cancelled",
    reason: String(formData.get("reason") || "") || undefined,
  });
  revalidatePath("/");
  revalidatePath(`/sessions/${sessionId}`);
  revalidatePath("/dashboard");
  redirect(`/sessions/${sessionId}`);
}

export async function switchDemoUserAction(formData: FormData) {
  const user = demoLogin(String(formData.get("email") ?? "alex@example.com"));
  await setDemoSessionCookie(user.id);
  const accepted = await acceptPendingInviteForCurrentUser();
  revalidatePath("/");
  if (getCurrentMember()) {
    redirect(accepted.status === "joined" ? "/invite/consumed" : "/");
  }
  redirect("/onboarding");
}
