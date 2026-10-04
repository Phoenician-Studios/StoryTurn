const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function normalizeInviteCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function generateInviteCode(length = 8, random = Math.random): string {
  if (length < 6 || length > 16) {
    throw new Error("Invite code length must be between 6 and 16");
  }
  let code = "";
  for (let i = 0; i < length; i++) {
    code += ALPHABET[Math.floor(random() * ALPHABET.length)]!;
  }
  return code;
}

export function isInviteUsable(params: {
  code: string;
  expectedCode: string;
  uses: number;
  maxUses: number | null;
  expiresAt: string | null;
  nowIso?: string;
}): { ok: true } | { ok: false; reason: string } {
  const now = params.nowIso ?? new Date().toISOString();
  if (normalizeInviteCode(params.code) !== normalizeInviteCode(params.expectedCode)) {
    return { ok: false, reason: "Invalid invite code" };
  }
  if (params.expiresAt && params.expiresAt < now) {
    return { ok: false, reason: "Invite code has expired" };
  }
  if (params.maxUses !== null && params.uses >= params.maxUses) {
    return { ok: false, reason: "Invite code has no uses left" };
  }
  return { ok: true };
}
