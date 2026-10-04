"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { appUrl, isDemoMode } from "@/lib/config";
import {
  addBookFromSearch,
  addKid,
  cancelSession,
  createFamily,
  createInviteCode,
  joinFamily,
  saveSchedule,
  updateSession,
} from "@/lib/data";
import { demoLogin, demoLogout } from "@/lib/demo/store";
import { searchOpenLibrary } from "@/lib/open-library";
import { createClient } from "@/lib/supabase/server";

function authErrorRedirect(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!email.includes("@")) {
    authErrorRedirect("/login", "Enter a valid email");
  }

  if (isDemoMode()) {
    demoLogin(email);
    redirect("/");
  }

  const password = String(formData.get("password") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) authErrorRedirect("/login", error.message);
  redirect("/");
}

export async function signupAction(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const displayName =
    String(formData.get("displayName") ?? "").trim() || email.split("@")[0] || "Reader";
  if (!email.includes("@")) {
    authErrorRedirect("/signup", "Enter a valid email");
  }

  if (isDemoMode()) {
    demoLogin(email);
    redirect("/");
  }

  if (password.length < 6) {
    authErrorRedirect("/signup", "Use at least 6 characters");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${appUrl()}/auth/callback`,
      data: { display_name: displayName },
    },
  });
  if (error) authErrorRedirect("/signup", error.message);
  if (!data.session) {
    redirect("/login?notice=Check your email to confirm your account");
  }
  redirect("/onboarding");
}

export async function googleLoginAction() {
  if (isDemoMode()) {
    authErrorRedirect("/login", "Google sign-in is available when demo mode is off");
  }
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${appUrl()}/auth/callback` },
  });
  if (error || !data.url) {
    authErrorRedirect("/login", error?.message ?? "Google sign-in failed");
  }
  redirect(data.url);
}

export async function resetPasswordAction(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!email.includes("@")) {
    authErrorRedirect("/reset-password", "Enter a valid email");
  }
  if (isDemoMode()) {
    redirect("/reset-password?sent=1");
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl()}/auth/callback?next=/reset-password/update`,
  });
  if (error) authErrorRedirect("/reset-password", error.message);
  redirect("/reset-password?sent=1");
}

export async function updatePasswordAction(formData: FormData) {
  if (isDemoMode()) redirect("/login");
  const password = String(formData.get("password") ?? "");
  if (password.length < 6) {
    authErrorRedirect("/reset-password/update", "Use at least 6 characters");
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) authErrorRedirect("/reset-password/update", error.message);
  redirect("/");
}

export async function logoutAction() {
  if (isDemoMode()) {
    demoLogout();
  } else {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/login");
}

export async function createFamilyAction(formData: FormData) {
  await createFamily(String(formData.get("name") ?? "Our family"));
  revalidatePath("/");
  redirect("/");
}

export async function joinFamilyAction(formData: FormData) {
  await joinFamily(String(formData.get("code") ?? ""));
  (await cookies()).delete("storyturn-invite");
  revalidatePath("/");
  redirect("/");
}

export async function addKidAction(formData: FormData) {
  await addKid(String(formData.get("name") ?? ""), Number(formData.get("age") ?? 0));
  revalidatePath("/family");
}

export async function createInviteAction() {
  await createInviteCode();
  revalidatePath("/family");
}

export async function saveScheduleAction(formData: FormData) {
  const readers = formData.getAll("readers").map(String);
  await saveSchedule({
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
  await addBookFromSearch({
    title: String(formData.get("title")),
    authors: String(formData.get("authors") ?? "")
      .split(",")
      .map((part) => part.trim())
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
  const status = String(formData.get("status"));
  if (status !== "scheduled" && status !== "completed" && status !== "cancelled") {
    throw new Error("Invalid status");
  }
  await updateSession({
    sessionId,
    memberIds: formData.getAll("memberIds").map(String),
    bookIds: formData.getAll("bookIds").map(String),
    freeformTitles: String(formData.get("freeformTitles") ?? "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
    notes: String(formData.get("notes") || "") || null,
    status,
    reason: String(formData.get("reason") || "") || undefined,
  });
  revalidatePath("/");
  revalidatePath(`/sessions/${sessionId}`);
  revalidatePath("/dashboard");
  redirect(`/sessions/${sessionId}`);
}

export async function switchDemoUserAction(formData: FormData) {
  if (!isDemoMode()) {
    authErrorRedirect("/login", "Demo users are only available in demo mode");
  }
  demoLogin(String(formData.get("email") ?? "alex@example.com"));
  revalidatePath("/");
  redirect("/");
}
