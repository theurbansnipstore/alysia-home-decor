import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

const CART_COOKIE_NAME = process.env.CART_COOKIE_NAME || "kutir_guest_cart";
const CART_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

export interface GuestCartItem {
  productId: string;
  quantity: number;
}

function getSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set. Add it to your .env file.");
  return new TextEncoder().encode(secret);
}

async function signCart(items: GuestCartItem[]): Promise<string> {
  return new SignJWT({ items })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${CART_COOKIE_MAX_AGE_SECONDS}s`)
    .sign(getSecretKey());
}

async function verifyCartToken(token: string): Promise<GuestCartItem[]> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    const items = (payload as { items?: unknown }).items;
    if (!Array.isArray(items)) return [];
    return items.filter(
      (i): i is GuestCartItem =>
        typeof i === "object" &&
        i !== null &&
        typeof (i as GuestCartItem).productId === "string" &&
        typeof (i as GuestCartItem).quantity === "number"
    );
  } catch {
    // Expired, malformed, or tampered token — treat as an empty cart rather than erroring.
    return [];
  }
}

async function saveGuestCart(items: GuestCartItem[]): Promise<void> {
  const token = await signCart(items);
  cookies().set(CART_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: CART_COOKIE_MAX_AGE_SECONDS,
  });
}

export async function getGuestCart(): Promise<GuestCartItem[]> {
  const token = cookies().get(CART_COOKIE_NAME)?.value;
  if (!token) return [];
  return verifyCartToken(token);
}

export async function addToGuestCart(productId: string, quantity: number): Promise<void> {
  const items = await getGuestCart();
  const existing = items.find((i) => i.productId === productId);
  if (existing) existing.quantity += quantity;
  else items.push({ productId, quantity });
  await saveGuestCart(items);
}

export async function updateGuestCartItem(productId: string, quantity: number): Promise<void> {
  let items = await getGuestCart();
  if (quantity <= 0) {
    items = items.filter((i) => i.productId !== productId);
  } else {
    const existing = items.find((i) => i.productId === productId);
    if (existing) existing.quantity = quantity;
  }
  await saveGuestCart(items);
}

export async function removeFromGuestCart(productId: string): Promise<void> {
  const items = (await getGuestCart()).filter((i) => i.productId !== productId);
  await saveGuestCart(items);
}

export async function clearGuestCart(): Promise<void> {
  cookies().set(CART_COOKIE_NAME, "", { httpOnly: true, path: "/", maxAge: 0 });
}
