import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth";
import { createSession } from "@/lib/session";
import { loginSchema } from "@/lib/validations/auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { mergeGuestCartIntoUserCart } from "@/lib/cart/merge";
import { mergeGuestWishlistIntoUserWishlist } from "@/lib/wishlist/merge";
import { importAddressesFromGuestOrders } from "@/lib/checkout/account-linking";

const INVALID_CREDENTIALS = "Invalid email or password";

const DECOY_HASH = "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return apiError("Invalid request body", 400);
    }

    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Invalid input", 400, parsed.error.flatten().fieldErrors);
    }

    const { email, password, rememberMe } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        passwordHash: true,
        isBlocked: true,
      },
    });

    const valid = await verifyPassword(password, user?.passwordHash ?? DECOY_HASH);

    if (!user || !valid || user.isBlocked) {
      return apiError(INVALID_CREDENTIALS, 401);
    }

    const sessionUser = { id: user.id, name: user.name, email: user.email, role: user.role };
    await createSession(sessionUser, { rememberMe });

    // Transparent to the user — no response field reflects any of these.
    await mergeGuestCartIntoUserCart(user.id);
    await mergeGuestWishlistIntoUserWishlist(user.id);
    await importAddressesFromGuestOrders(user.id, user.email);

    return apiSuccess({ user: sessionUser });
  } catch (err) {
    console.error("[POST /api/auth/login]", err);
    return apiError("Login failed. Please try again.", 500);
  }
}
