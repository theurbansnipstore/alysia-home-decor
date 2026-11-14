import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildCartSnapshot, addToCart } from "@/lib/cart/service";
import { addToCartSchema } from "@/lib/validations/cart";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function GET() {
  try {
    const snapshot = await buildCartSnapshot();
    return apiSuccess(snapshot);
  } catch (err) {
    console.error("[GET /api/cart]", err);
    return apiError("Failed to load cart", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return apiError("Invalid request body", 400);

    const parsed = addToCartSchema.safeParse(body);
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

    await addToCart(parsed.data.productId, parsed.data.quantity);
    const snapshot = await buildCartSnapshot();
    return apiSuccess(snapshot, 201);
  } catch (err) {
    console.error("[POST /api/cart]", err);
    return apiError("Failed to add item to cart", 500);
  }
}
