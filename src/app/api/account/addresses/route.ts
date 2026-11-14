import { NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { getUserAddresses, createAddress } from "@/lib/data/addresses";
import { addressSchema } from "@/lib/validations/address";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function GET() {
  const session = await getSession();
  if (!session) return apiError("Not authenticated", 401);

  try {
    const addresses = await getUserAddresses(session.id);
    return apiSuccess({ addresses });
  } catch (err) {
    console.error("[GET /api/account/addresses]", err);
    return apiError("Failed to load addresses", 500);
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return apiError("Not authenticated", 401);

  try {
    const body = await req.json().catch(() => null);
    if (!body) return apiError("Invalid request body", 400);

    const parsed = addressSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Invalid input", 400, parsed.error.flatten().fieldErrors);
    }

    const address = await createAddress(session.id, parsed.data);
    return apiSuccess({ address }, 201);
  } catch (err) {
    console.error("[POST /api/account/addresses]", err);
    return apiError("Failed to save address", 500);
  }
}
