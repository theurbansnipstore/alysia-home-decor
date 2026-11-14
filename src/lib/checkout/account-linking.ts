import "server-only";
import { prisma } from "@/lib/prisma";
import type { AddressSnapshot } from "@/lib/checkout/snapshot";

function isValidSnapshot(value: unknown): value is AddressSnapshot {
  const v = value as Partial<AddressSnapshot> | null;
  return !!v && typeof v.line1 === "string" && typeof v.pincode === "string" && typeof v.phone === "string";
}

/**
 * Finds guest orders (userId: null) matching a customer's verified email
 * and imports their shipping/billing addresses into the Address Book.
 *
 * - Idempotent: safe to call on every login/registration; duplicate
 *   addresses (same line1 + pincode + phone) are skipped.
 * - Never modifies the Order rows themselves — order snapshots remain
 *   immutable forever, exactly as designed in Module 9. This only ever
 *   creates new Address rows for future checkout convenience.
 * - Preserves existing default-address logic: only sets a new address as
 *   default if the customer doesn't already have one.
 */
export async function importAddressesFromGuestOrders(userId: string, email: string): Promise<void> {
  const guestOrders = await prisma.order.findMany({
    where: { userId: null, customerEmail: email.toLowerCase() },
    select: { shippingAddress: true, billingAddress: true },
  });

  if (guestOrders.length === 0) return;

  const existingAddresses = await prisma.address.findMany({ where: { userId } });

  function alreadyKnown(candidate: AddressSnapshot, alsoCheck: AddressSnapshot[]): boolean {
    const matches = (a: { line1: string; pincode: string; phone: string }) =>
      a.line1 === candidate.line1 && a.pincode === candidate.pincode && a.phone === candidate.phone;
    return existingAddresses.some(matches) || alsoCheck.some(matches);
  }

  const toImport: AddressSnapshot[] = [];
  for (const order of guestOrders) {
    for (const raw of [order.shippingAddress, order.billingAddress]) {
      if (!isValidSnapshot(raw)) continue;
      if (alreadyKnown(raw, toImport)) continue;
      toImport.push(raw);
    }
  }

  if (toImport.length === 0) return;

  const hasDefault = existingAddresses.some((a) => a.isDefault);

  for (const [i, snapshot] of toImport.entries()) {
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
        isDefault: !hasDefault && i === 0,
      },
    });
  }
}
