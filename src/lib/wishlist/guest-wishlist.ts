import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

// Mirrors src/lib/cart/guest-cart.ts's structure and security approach
// exactly (signed JWT cookie, not a plain/unsigned one) — only the payload
// shape differs (product ids only, no quantity).
const WISHLIST_COOKIE_NAME = process.env.WISHLIST_COOKIE_NAME || "kutir_guest_wishlist";
const WISHLIST_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days, matches guest cart

function getSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set. Add it to your .env file.");
  return new TextEncoder().encode(secret);
}

async function signWishlist(productIds: string[]): Promise<string> {
  return new SignJWT({ productIds })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${WISHLIST_COOKIE_MAX_AGE_SECONDS}s`)
    .sign(getSecretKey());
}

async function verifyWishlistToken(token: string): Promise<string[]> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    const productIds = (payload as { productIds?: unknown }).productIds;
    if (!Array.isArray(productIds)) return [];
    return productIds.filter((id): id is string => typeof id === "string");
  } catch {
    // Expired, malformed, or tampered token — treat as an empty wishlist rather than erroring.
    return [];
  }
}

async function saveGuestWishlist(productIds: string[]): Promise<void> {
  const token = await signWishlist(productIds);
  cookies().set(WISHLIST_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: WISHLIST_COOKIE_MAX_AGE_SECONDS,
  });
}

export async function getGuestWishlist(): Promise<string[]> {
  const token = cookies().get(WISHLIST_COOKIE_NAME)?.value;
  if (!token) return [];
  return verifyWishlistToken(token);
}

export async function addToGuestWishlist(productId: string): Promise<void> {
  const productIds = await getGuestWishlist();
  if (!productIds.includes(productId)) {
    productIds.push(productId);
    await saveGuestWishlist(productIds);
  }
}

export async function removeFromGuestWishlist(productId: string): Promise<void> {
  const productIds = (await getGuestWishlist()).filter((id) => id !== productId);
  await saveGuestWishlist(productIds);
}

export async function clearGuestWishlist(): Promise<void> {
  cookies().set(WISHLIST_COOKIE_NAME, "", { httpOnly: true, path: "/", maxAge: 0 });
}
