import { NextRequest } from "next/server";
import { z } from "zod";
import { requireApiRole } from "@/lib/admin/api-auth";
import { ORDER_FULL_ACCESS_ROLES } from "@/lib/admin/order-roles";
import { initiateRefund, getRefundEligibility } from "@/lib/integrations/payment/razorpay-refund";
import { apiSuccess, apiError } from "@/lib/api-response";

const refundRequestSchema = z.object({
  amount: z.number().positive().optional(),
});

/**
 * Admin-only refund initiation (Module 28). Reuses ORDER_FULL_ACCESS_ROLES
 * — the same role gate already governing manual status changes and
 * shipment creation — no new role invented. Server is the sole authority
 * on eligibility (getRefundEligibility()); a client-side button being
 * hidden is a UX nicety, never the actual enforcement.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiRole(ORDER_FULL_ACCESS_ROLES);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json().catch(() => ({}));
    const parsed = refundRequestSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Invalid refund request.", 400, parsed.error.flatten().fieldErrors);
    }

    const result = await initiateRefund({ orderId: params.id, amount: parsed.data.amount, actorUserId: auth.session.id });
    if (!result.success) {
      return apiError(result.error || "Could not initiate refund.", 400);
    }
    return apiSuccess({ refundStatus: result.refundStatus });
  } catch (err) {
    console.error("[POST /api/admin/orders/[id]/refund]", err);
    return apiError("Could not initiate refund.", 500);
  }
}

/** Lets the admin UI decide whether to render the refund button/amount field without duplicating eligibility logic client-side. */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiRole(ORDER_FULL_ACCESS_ROLES);
  if (!auth.ok) return auth.response;

  const eligibility = await getRefundEligibility(params.id);
  return apiSuccess(eligibility);
}
