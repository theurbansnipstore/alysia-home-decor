import "server-only";
import { prisma } from "@/lib/prisma";
import type { AddressSnapshot } from "@/lib/checkout/snapshot";

/**
 * Called after a logged-in user places an order using a freshly-typed
 * (not saved-address-book) shipping address — saves that address to their
 * Address Book for convenience next time.
 *
 * - Idempotent: skipped if a matching address (same line1 + pincode +
 *   phone) already exists for this user — identical duplicate-detection
 *   convention to the guest-order linking service
 *   (src/lib/checkout/account-linking.ts), for consistency between the
 *   two address-saving paths.
 * - Never sets isDefault — an existing default address is left
 *   completely untouched, and this new address does not become default
 *   even if the user has none yet (matches "does NOT need to become the
 *   default address automatically").
 * - Never touches Order.shippingAddress/billingAddress — those are
 *   already-written immutable JSON snapshots on the Order; this only
 *   ever creates an independent Address row.
 *
 * Caller contract (see integration note): only call this when
 * `session` exists AND the order did NOT use a `savedAddressId` — i.e.
 * never for guest orders, and never when an existing saved address was
 * selected (there's nothing new to save in that case).
 */
export async function saveCheckoutAddressIfNew(userId: string, snapshot: AddressSnapshot): Promise<void> {
  const existingAddresses = await prisma.address.findMany({ where: { userId } });

  const isDuplicate = existingAddresses.some(
    (a) => a.line1 === snapshot.line1 && a.pincode === snapshot.pincode && a.phone === snapshot.phone
  );
  if (isDuplicate) return;

  await prisma.address.create({
    data: {
      userId,
      fullName: snapshot.fullName,
      phone: snapshot.phone,
      line1: snapshot.line1,
      line2: snapshot.line2 || null,
      city: snapshot.city,
      state: snapshot.state,
      pincode: snapshot.pincode,
      country: snapshot.country || "India",
      isDefault: false,
    },
  });
}
