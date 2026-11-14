import "server-only";
import type { AddressSnapshot } from "@/lib/checkout/snapshot";

/**
 * Attempt-first design: no Order/Payment row exists between "Razorpay order
 * created" and "payment verified" (per Module 11 decision — do not create
 * durable state before successful payment). So the cart/address/pricing
 * snapshot needed to build the real Order at finalize time has to travel
 * inside the Razorpay order itself, via its `notes` field — the only place
 * both the browser (/verify) and Razorpay's server (/webhook, no cookies,
 * no DB session) can both retrieve it from.
 *
 * Razorpay's notes: max 15 key-value pairs, 256 chars per value (confirmed
 * against the installed razorpay@2.9.4 SDK's own type definitions, not
 * assumed). A full snapshot is minified to JSON, then split across chunk
 * keys ("p0".."p13") to stay inside that budget, with 1 key reserved for
 * the chunk count. Optional fields are dropped (not truncated silently)
 * in priority order if the snapshot doesn't fit; if even the essentials
 * (email/address/items) don't fit, order creation is refused with a clear
 * error rather than silently corrupting the payload.
 */

const MAX_NOTE_KEYS = 15;
const MAX_VALUE_LEN = 240; // stay comfortably under Razorpay's 256-char limit
const MAX_CHUNKS = MAX_NOTE_KEYS - 1; // reserve 1 key for the chunk count
const MAX_TOTAL_LEN = MAX_CHUNKS * MAX_VALUE_LEN;

export interface RazorpayAttemptItem {
  productId: string;
  quantity: number;
  /** Snapshot of discountPrice||price at attempt time — same convention OrderItem already uses. */
  price: string;
  /** Truncated product name snapshot, same intent as OrderItem.name. */
  name: string;
}

export interface RazorpayAttemptSnapshot {
  email: string;
  userId?: string;
  address: AddressSnapshot;
  /** undefined means "same as shipping" (always the default). Present only when the customer explicitly chose "use a different billing address" AND the store's allowDifferentBillingAddress setting is ON — the create-order route (not this file) is what enforces that gate before building this snapshot (Module 43). */
  billingAddress?: AddressSnapshot;
  deliveryInstructions?: string;
  giftMessage?: string;
  gstNumber?: string;
  companyName?: string;
  couponCode?: string;
  items: RazorpayAttemptItem[];
}

type CompactAddress = [string, string, string, string | undefined, string, string, string, string, string | undefined]; // fullName, phone, line1, line2, city, state, pincode, country, countryCode

// Short keys purely to save space inside the 256-char/value, 15-key budget.
interface CompactSnapshot {
  e: string;
  u?: string;
  a: CompactAddress;
  b?: CompactAddress;
  di?: string;
  gm?: string;
  gst?: string;
  cn?: string;
  cc?: string;
  it: [string, number, string, string][]; // productId, quantity, price, name
}

function toCompactAddress(a: AddressSnapshot): CompactAddress {
  return [a.fullName, a.phone, a.line1, a.line2, a.city, a.state, a.pincode, a.country, a.countryCode];
}

function fromCompactAddress(c: CompactAddress): AddressSnapshot {
  const [fullName, phone, line1, line2, city, state, pincode, country, countryCode] = c;
  return { fullName, phone, line1, line2, city, state, pincode, country, countryCode };
}

function toCompact(snapshot: RazorpayAttemptSnapshot): CompactSnapshot {
  return {
    e: snapshot.email,
    u: snapshot.userId,
    a: toCompactAddress(snapshot.address),
    b: snapshot.billingAddress ? toCompactAddress(snapshot.billingAddress) : undefined,
    di: snapshot.deliveryInstructions,
    gm: snapshot.giftMessage,
    gst: snapshot.gstNumber,
    cn: snapshot.companyName,
    cc: snapshot.couponCode,
    it: snapshot.items.map((i) => [i.productId, i.quantity, i.price, i.name.slice(0, 40)]),
  };
}

function fromCompact(c: CompactSnapshot): RazorpayAttemptSnapshot {
  return {
    email: c.e,
    userId: c.u,
    address: fromCompactAddress(c.a),
    billingAddress: c.b ? fromCompactAddress(c.b) : undefined,
    deliveryInstructions: c.di,
    giftMessage: c.gm,
    gstNumber: c.gst,
    companyName: c.cn,
    couponCode: c.cc,
    items: c.it.map(([productId, quantity, price, name]) => ({ productId, quantity, price, name })),
  };
}

function chunk(str: string): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < str.length; i += MAX_VALUE_LEN) {
    chunks.push(str.slice(i, i + MAX_VALUE_LEN));
  }
  return chunks;
}

export interface EncodeResult {
  ok: true;
  notes: Record<string, string>;
  droppedOptionalFields: string[];
}
export interface EncodeFailure {
  ok: false;
  error: string;
}

/**
 * Encodes the snapshot into Razorpay `notes`, dropping optional fields
 * (in this priority order) if the essentials don't otherwise fit.
 */
export function encodeAttemptSnapshot(snapshot: RazorpayAttemptSnapshot): EncodeResult | EncodeFailure {
  const droppable: (keyof RazorpayAttemptSnapshot)[] = [
    "deliveryInstructions",
    "giftMessage",
    "gstNumber",
    "companyName",
    "couponCode",
  ];
  const dropped: string[] = [];
  let working = { ...snapshot };

  while (true) {
    const json = JSON.stringify(toCompact(working));
    if (json.length <= MAX_TOTAL_LEN) {
      const pieces = chunk(json);
      const notes: Record<string, string> = { n: String(pieces.length) };
      pieces.forEach((piece, i) => (notes[`p${i}`] = piece));
      return { ok: true, notes, droppedOptionalFields: dropped };
    }

    const next = droppable.find((f) => working[f] !== undefined);
    if (!next) {
      return {
        ok: false,
        error: "This order is too large for online payment (cart or address too long). Please use Cash on Delivery or reduce your cart size.",
      };
    }
    working = { ...working, [next]: undefined };
    dropped.push(next);
  }
}

export function decodeAttemptSnapshot(notes: Record<string, unknown>): RazorpayAttemptSnapshot {
  const count = parseInt(String(notes.n ?? "0"), 10);
  if (!count || count < 1 || count > MAX_CHUNKS) {
    throw new Error("Malformed Razorpay order notes: missing or invalid chunk count.");
  }
  let json = "";
  for (let i = 0; i < count; i += 1) {
    const piece = notes[`p${i}`];
    if (typeof piece !== "string") {
      throw new Error(`Malformed Razorpay order notes: missing chunk p${i}.`);
    }
    json += piece;
  }
  const compact = JSON.parse(json) as CompactSnapshot;
  return fromCompact(compact);
}
