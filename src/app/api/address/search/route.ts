import { NextRequest } from "next/server";
import { getAddressProvider } from "@/lib/providers/address/registry";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const query = req.nextUrl.searchParams.get("q") || "";
    const countryCode = req.nextUrl.searchParams.get("country") || undefined;
    const suggestions = await getAddressProvider().search(query, countryCode);
    return apiSuccess({ suggestions });
  } catch (err) {
    console.error("[GET /api/address/search]", err);
    return apiError("Address search failed", 500);
  }
}
