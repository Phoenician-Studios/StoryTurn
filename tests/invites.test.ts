import { describe, expect, it } from "vitest";
import {
  generateInviteCode,
  isInviteUsable,
  normalizeInviteCode,
} from "@/lib/domain/invites";

describe("invite codes", () => {
  it("normalizes casing and noise", () => {
    expect(normalizeInviteCode(" ab-cd_12 ")).toBe("ABCD12");
  });

  it("generates deterministic codes with a stub RNG", () => {
    let i = 0;
    const code = generateInviteCode(8, () => {
      i += 0.01;
      return i % 1;
    });
    expect(code).toHaveLength(8);
    expect(code).toMatch(/^[A-Z0-9]+$/);
  });

  it("validates expiry and max uses", () => {
    expect(
      isInviteUsable({
        code: "ABC",
        expectedCode: "abc",
        uses: 0,
        maxUses: 1,
        expiresAt: null,
      }).ok,
    ).toBe(true);

    expect(
      isInviteUsable({
        code: "ABC",
        expectedCode: "ABC",
        uses: 1,
        maxUses: 1,
        expiresAt: null,
      }),
    ).toEqual({ ok: false, reason: "Invite code has no uses left" });

    expect(
      isInviteUsable({
        code: "ABC",
        expectedCode: "ABC",
        uses: 0,
        maxUses: null,
        expiresAt: "2020-01-01T00:00:00.000Z",
        nowIso: "2026-01-01T00:00:00.000Z",
      }),
    ).toEqual({ ok: false, reason: "Invite code has expired" });
  });
});
