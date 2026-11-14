import { NextRequest } from "next/server";
import { buildCartSnapshot, updateCartItem, removeCartItem } from "@/lib/cart/service";
import { updateCartItemSchema } from "@/lib/validations/cart";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function PATCH(req: NextRequest, { params }: { params: { productId: string } }) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return apiError("Invalid request body", 400);

    const parsed = updateCartItemSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Invalid input", 400, parsed.error.flatten().fieldErrors);
    }

    await updateCartItem(params.productId, parsed.data.quantity);
    const snapshot = await buildCartSnapshot();
    return apiSuccess(snapshot);
  } catch (err) {
    console.error("[PATCH /api/cart/items/[productId]]", err);
    return apiError("Failed to update cart", 500);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { productId: string } }) {
  try {
    await removeCartItem(params.productId);
    const snapshot = await buildCartSnapshot();
    return apiSuccess(snapshot);
  } catch (err) {
    console.error("[DELETE /api/cart/items/[productId]]", err);
    return apiError("Failed to remove item", 500);
  }
}
