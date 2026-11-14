import { NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { updateAddress, deleteAddress } from "@/lib/data/addresses";
import { addressSchema } from "@/lib/validations/address";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return apiError("Not authenticated", 401);

  try {
    const body = await req.json().catch(() => null);
    if (!body) return apiError("Invalid request body", 400);

    const parsed = addressSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Invalid input", 400, parsed.error.flatten().fieldErrors);
    }

    const address = await updateAddress(session.id, params.id, parsed.data);
    if (!address) return apiError("Address not found", 404);

    return apiSuccess({ address });
  } catch (err) {
    console.error("[PATCH /api/account/addresses/[id]]", err);
    return apiError("Failed to update address", 500);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return apiError("Not authenticated", 401);

  try {
    const deleted = await deleteAddress(session.id, params.id);
    if (!deleted) return apiError("Address not found", 404);
    return apiSuccess({ deleted: true });
  } catch (err) {
    console.error("[DELETE /api/account/addresses/[id]]", err);
    return apiError("Failed to delete address", 500);
  }
}
