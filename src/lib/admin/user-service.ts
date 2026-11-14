import "server-only";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";
import { hashPassword } from "@/lib/auth";
import { countSuperAdmins } from "@/lib/data/admin-users";

export type UserServiceResult<T = undefined> = { ok: true; data: T } | { ok: false; status: number; error: string };

export async function createStaffUser(input: {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: Role;
}): Promise<UserServiceResult<{ id: string }>> {
  if (input.role === "CUSTOMER") {
    return { ok: false, status: 400, error: "Use a role other than CUSTOMER for staff accounts." };
  }

  const existing = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
  if (existing) {
    return { ok: false, status: 409, error: "A user with this email already exists." };
  }

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      phone: input.phone || null,
      role: input.role,
    },
    select: { id: true },
  });

  return { ok: true, data: { id: user.id } };
}

/**
 * Guards: target must be a real staff account (never touches CUSTOMER
 * accounts through this path — Customers has its own screen); demoting
 * the last remaining SUPER_ADMIN (including a SUPER_ADMIN demoting
 * themselves) is blocked outright, since USER_MANAGEMENT_ROLES already
 * restricts this whole area to SUPER_ADMIN, so self-escalation from a
 * lower role is structurally impossible — the only remaining risk is
 * accidentally locking everyone out, which this guard prevents.
 */
export async function assignUserRole(targetUserId: string, newRole: Role): Promise<UserServiceResult> {
  const target = await prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true, role: true } });
  if (!target) return { ok: false, status: 404, error: "User not found." };

  if (target.role === "SUPER_ADMIN" && newRole !== "SUPER_ADMIN") {
    const count = await countSuperAdmins();
    if (count <= 1) {
      return { ok: false, status: 400, error: "Cannot remove the last remaining SUPER_ADMIN." };
    }
  }

  await prisma.user.update({ where: { id: targetUserId }, data: { role: newRole } });
  return { ok: true, data: undefined };
}

export async function setStaffBlocked(targetUserId: string, isBlocked: boolean): Promise<UserServiceResult> {
  const target = await prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true, role: true } });
  if (!target || target.role === "CUSTOMER") return { ok: false, status: 404, error: "Staff user not found." };

  if (target.role === "SUPER_ADMIN" && isBlocked) {
    const count = await countSuperAdmins();
    if (count <= 1) {
      return { ok: false, status: 400, error: "Cannot deactivate the last remaining SUPER_ADMIN." };
    }
  }

  await prisma.user.update({ where: { id: targetUserId }, data: { isBlocked } });
  return { ok: true, data: undefined };
}

/**
 * No real email-delivery service exists in this project (the notifications
 * bus logs instead of sending — see src/lib/services/notifications/). A
 * true "send reset link" flow can't honestly be built without inventing
 * one, so this sets a new password directly (immediately hashed, never
 * returned in the response) — SUPER_ADMIN would communicate it out of
 * band. Same trust boundary as every other admin mutation: only reachable
 * by SUPER_ADMIN, via the existing hashPassword(), never plaintext-stored.
 */
export async function resetStaffPassword(targetUserId: string, newPassword: string): Promise<UserServiceResult> {
  const target = await prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true, role: true } });
  if (!target || target.role === "CUSTOMER") return { ok: false, status: 404, error: "Staff user not found." };

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: targetUserId }, data: { passwordHash } });
  return { ok: true, data: undefined };
}
