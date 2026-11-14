import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentWishlist, addToWishlist } from "@/lib/wishlist/service";
import { addToWishlistSchema } from "@/lib/validations/wishlist";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function GET() {
  try {
    const items = await getCurrentWishlist();
    return apiSuccess({ items });
  } catch (err) {
    console.error("[GET /api/wishlist]", err);
    return apiError("Failed to load wishlist", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return apiError("Invalid request body", 400);

    const parsed = addToWishlistSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Invalid input", 400, parsed.error.flatten().fieldErrors);
    }

    const product = await prisma.product.findUnique({
      where: { id: parsed.data.productId },
      select: { id: true, status: true },
    });
    if (!product || product.status !== "ACTIVE") {
      return apiError("Product not found", 404);
    }

    await addToWishlist(parsed.data.productId);
    const items = await getCurrentWishlist();
    return apiSuccess({ items }, 201);
  } catch (err) {
    console.error("[POST /api/wishlist]", err);
    return apiError("Failed to add to wishlist", 500);
  }
}
