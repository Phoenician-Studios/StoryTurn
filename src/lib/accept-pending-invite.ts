import {
  clearPendingInvite,
  peekPendingInvite,
} from "@/lib/pending-invite";
import { getCurrentMember, getCurrentUser, joinFamily } from "@/lib/demo/store";

export type AcceptPendingInviteResult =
  | { status: "joined"; code: string }
  | { status: "none" }
  | { status: "failed"; reason: string };

/**
 * If the browser has a pending invite cookie and the signed-in user is not
 * already in a family, join that family and clear the cookie.
 */
export async function acceptPendingInviteForCurrentUser(): Promise<AcceptPendingInviteResult> {
  const code = await peekPendingInvite();
  if (!code) return { status: "none" };

  const user = getCurrentUser();
  if (!user) return { status: "none" };

  if (getCurrentMember()) {
    await clearPendingInvite();
    return { status: "none" };
  }

  try {
    joinFamily(code);
    await clearPendingInvite();
    return { status: "joined", code };
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : "Could not accept invite";
    return { status: "failed", reason };
  }
}
