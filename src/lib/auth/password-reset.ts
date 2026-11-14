import "server-only";
import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { destroySession } from "@/lib/session";
import { emit } from "@/lib/services/notifications";

const TOKEN_BYTES = 32;
const EXPIRY_MINUTES = 60;

function generateRawToken(): string {
  return randomBytes(TOKEN_BYTES).toString("hex");
}

/** SHA-256, not bcrypt: the raw token is already a 256-bit random value —
 *  bcrypt's per-hash salt exists to slow down brute-forcing a low-entropy
 *  human password, and would make an indexed lookup by token impossible
 *  (each hash of the same input differs). A fast deterministic hash is the
 *  correct, standard choice for a high-entropy token used only for lookup. */
function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

/**
 * Always resolves successfully regardless of whether the email is
 * registered — the caller (the API route) returns the same generic message
 * either way, so this function must never let its own result leak whether
 * an account exists. No DB writes at all happen for an unknown email.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true, email: true } });
  if (!user) return;

  const rawToken = generateRawToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + EXPIRY_MINUTES * 60 * 1000);

  await prisma.$transaction([
    // Only the latest requested link is ever valid — an admin/user
    // triggering "forgot password" twice shouldn't leave two live links.
    prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } }),
    prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash, expiresAt } }),
  ]);

  const resetUrl = `${getSiteUrl()}/reset-password?token=${rawToken}`;
  await emit("password.reset", { email: user.email, name: user.name, resetUrl });
}

export type ResetPasswordError = "INVALID_TOKEN" | "EXPIRED_TOKEN" | "USED_TOKEN";

export interface ResetPasswordResult {
  success: boolean;
  error?: ResetPasswordError;
}

export async function resetPasswordWithToken(rawToken: string, newPassword: string): Promise<ResetPasswordResult> {
  const tokenHash = hashToken(rawToken);
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

  if (!record) return { success: false, error: "INVALID_TOKEN" };
  if (record.usedAt) return { success: false, error: "USED_TOKEN" };
  if (record.expiresAt < new Date()) return { success: false, error: "EXPIRED_TOKEN" };

  const passwordHash = await hashPassword(newPassword);

  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);

  // Best-effort session hygiene: clears the CURRENT browser's cookie, same
  // as a normal logout. This does not revoke any other already-issued JWT
  // (e.g. a different device) — the session architecture is stateless
  // (no server-side session store/blocklist), the same documented
  // trade-off change-password already accepts elsewhere in this codebase.
  // A full fix would mean adding a DB check to getSession() on every
  // authenticated request site-wide, which is a materially bigger and
  // riskier change than this module's scope.
  await destroySession();

  return { success: true };
}
