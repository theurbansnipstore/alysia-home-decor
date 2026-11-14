import { NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { setDefaultAddress } from "@/lib/data/addresses";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return apiError("Not authenticated", 401);

  try {
    const success = await setDefaultAddress(session.id, params.id);
    if (!success) return apiError("Address not found", 404);
    return apiSuccess({ success: true });
  } catch (err) {
    console.error("[POST /api/account/addresses/[id]/default]", err);
    return apiError("Failed to set default address", 500);
  }
}
