// Query live data and request context only when this endpoint is called.
export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { getPincodeProvider } from "@/lib/providers/address/registry";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function GET(req: NextRequest, { params }: { params: { pincode: string } }) {
  try {
    const countryCode = req.nextUrl.searchParams.get("country") || "IN";
    const result = await getPincodeProvider(countryCode).lookupPincode(params.pincode, countryCode);
    if (!result) {
      return apiError("Could not find that PIN / postal code", 404);
    }
    return apiSuccess(result);
  } catch (err) {
    console.error("[GET /api/address/pincode/[pincode]]", err);
    return apiError("Failed to look up PIN code", 500);
  }
}
