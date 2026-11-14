import { NextRequest } from "next/server";
import { z } from "zod";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireApiRole } from "@/lib/admin/api-auth";
import { CUSTOMER_RISK_MANAGEMENT_ROLES } from "@/lib/admin/customer-roles";
import { setCodBlocked, getCodRiskSummary } from "@/lib/orders/cod-risk";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  blocked: z.boolean(),
  note: z.string().trim().min(1, "A note is required.").max(500),
});

/** Manual admin override — restrict or restore a customer's COD access. Always requires a note (stored as the visible reason when restricting; the lift itself is still audited via ActivityLog even though no reason is retained for "not restricted"). */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiRole(CUSTOMER_RISK_MANAGEMENT_ROLES);
  if (!auth.ok) return auth.response;

  const target = await prisma.user.findUnique({ where: { id: params.id }, select: { id: true, role: true } });
  if (!target || target.role !== "CUSTOMER") return apiError("Customer not found", 404);

  const body = await req.json().catch(() => null);
  if (!body) return apiError("Invalid request body", 400);

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return apiError("Invalid input", 400, parsed.error.flatten().fieldErrors);

  try {
    await setCodBlocked({
      userId: target.id,
      blocked: parsed.data.blocked,
      reason: parsed.data.note,
      actorUserId: auth.session.id,
    });
    const codRisk = await getCodRiskSummary(target.id);
    return apiSuccess({ codRisk });
  } catch (err) {
    console.error("[PATCH /api/admin/customers/[id]/cod-status]", err);
    return apiError("Failed to update COD status", 500);
  }
}
