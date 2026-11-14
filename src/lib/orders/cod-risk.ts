import "server-only";
import { prisma } from "@/lib/prisma";
import { emit } from "@/lib/services/notifications";
import { logActivity } from "@/lib/admin/activity-log";

/**
 * The ONE Order.statusReason value that counts toward COD risk (Module 21
 * audit finding: RETURNED alone conflates refused-COD with a legitimate
 * post-delivery return — only CUSTOMER_REFUSED_COD, which status-service.ts
 * restricts to a COD order transitioning OUT_FOR_DELIVERY -> RETURNED,
 * actually proves a non-acceptance).
 */
const QUALIFYING_REASON = "CUSTOMER_REFUSED_COD" as const;

/** Threshold and window kept as simple exported constants (not a DB-backed
 *  setting) — Module 21 Part 2's explicit instruction to keep the first
 *  implementation simple. 3 incidents in 6 months mirrors Policy A from the
 *  prior audit: it only counts a signal that's already 100% unambiguous in
 *  the data, so a low threshold doesn't risk over-restricting on noise. */
export const COD_RISK_THRESHOLD = 3;
export const COD_RISK_WINDOW_DAYS = 180;

const SYSTEM_ACTOR = "SYSTEM";
const AUTO_BLOCK_REASON = "Repeated unaccepted COD deliveries";

export interface CodRiskSummary {
  codBlocked: boolean;
  codBlockedReason: string | null;
  codBlockedAt: Date | null;
  codBlockedBy: string | null;
  /** Qualifying incidents within the rolling window — the exact figure the auto-block decision is based on. */
  qualifyingIncidentCount: number;
  qualifyingIncidentCountWindowDays: number;
  lastQualifyingIncidentAt: Date | null;
}

function windowStart(): Date {
  const d = new Date();
  d.setDate(d.getDate() - COD_RISK_WINDOW_DAYS);
  return d;
}

/** Live-computed, never cached/stored — avoids a counter that could drift from the source of truth (Order rows). */
export async function getQualifyingCodIncidents(userId: string) {
  return prisma.order.findMany({
    where: {
      userId,
      paymentMethod: "COD",
      status: "RETURNED",
      statusReason: QUALIFYING_REASON,
      createdAt: { gte: windowStart() },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, orderNumber: true, createdAt: true },
  });
}

/** Full risk summary for the admin customer-detail page — combines the persisted block state with the live incident count. */
export async function getCodRiskSummary(userId: string): Promise<CodRiskSummary> {
  const [user, incidents] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { codBlocked: true, codBlockedReason: true, codBlockedAt: true, codBlockedBy: true },
    }),
    getQualifyingCodIncidents(userId),
  ]);

  return {
    codBlocked: user?.codBlocked ?? false,
    codBlockedReason: user?.codBlockedReason ?? null,
    codBlockedAt: user?.codBlockedAt ?? null,
    codBlockedBy: user?.codBlockedBy ?? null,
    qualifyingIncidentCount: incidents.length,
    qualifyingIncidentCountWindowDays: COD_RISK_WINDOW_DAYS,
    lastQualifyingIncidentAt: incidents[0]?.createdAt ?? null,
  };
}

/**
 * Called from status-service.ts right after a COD order is transitioned to
 * RETURNED with reason=CUSTOMER_REFUSED_COD. Auto-restriction is
 * one-directional: this can only turn codBlocked ON, never off — an admin
 * manually lifting it (setCodBlocked) is the only way to restore COD, so a
 * lapsed/aged-out incident never silently re-enables it on its own (no
 * background job exists or is added here). If the customer is already
 * blocked, this is a no-op — never re-writes codBlockedAt/reason.
 */
export async function evaluateCodRiskAfterRefusal(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { codBlocked: true, name: true, email: true, phone: true } });
  if (!user || user.codBlocked) return;

  const incidents = await getQualifyingCodIncidents(userId);
  if (incidents.length < COD_RISK_THRESHOLD) return;

  await prisma.user.update({
    where: { id: userId },
    data: { codBlocked: true, codBlockedReason: AUTO_BLOCK_REASON, codBlockedAt: new Date(), codBlockedBy: SYSTEM_ACTOR },
  });

  try {
    await logActivity(prisma, {
      userId,
      action: "user.cod_restricted",
      entity: "User",
      entityId: userId,
      metadata: {
        previousCodStatus: false,
        newCodStatus: true,
        reason: AUTO_BLOCK_REASON,
        performedBy: "SYSTEM",
        qualifyingIncidentCount: incidents.length,
      },
    });
  } catch (err) {
    console.error("[cod-risk] failed to write ActivityLog (block was still applied)", err);
  }

  await emit("cod.restricted", {
    userId,
    email: user.email,
    phone: user.phone ?? undefined,
    name: user.name,
  });
}

export interface SetCodBlockedInput {
  userId: string;
  blocked: boolean;
  reason: string;
  actorUserId: string;
}

/** Manual admin override — the only way to lift an auto-applied restriction, and also usable to restrict a customer directly. Always requires a note, always audited via the existing ActivityLog (no new audit table). */
export async function setCodBlocked(input: SetCodBlockedInput): Promise<void> {
  const { userId, blocked, reason, actorUserId } = input;

  const before = await prisma.user.findUnique({ where: { id: userId }, select: { codBlocked: true } });

  await prisma.user.update({
    where: { id: userId },
    data: {
      codBlocked: blocked,
      codBlockedReason: blocked ? reason : null,
      codBlockedAt: blocked ? new Date() : null,
      codBlockedBy: blocked ? actorUserId : null,
    },
  });

  await logActivity(prisma, {
    userId: actorUserId,
    action: blocked ? "user.cod_restricted_manual" : "user.cod_restriction_lifted",
    entity: "User",
    entityId: userId,
    metadata: { previousCodStatus: before?.codBlocked ?? false, newCodStatus: blocked, reason },
  });
}
