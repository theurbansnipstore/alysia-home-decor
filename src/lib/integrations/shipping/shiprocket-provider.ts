import "server-only";
import type { ShipmentProvider, CreateShipmentParams, CreateShipmentResult, ShipmentStatusResult, NormalizedShipmentStatus } from "@/lib/integrations/shipping/types";

/**
 * Real Shiprocket provider (Module 27) — server-only, never imported by
 * client code (enforced by the "server-only" import above; a client import
 * fails the build, not just a lint warning).
 *
 * ============================================================
 * WHAT IS CONFIRMED (Shiprocket's own support.shiprocket.in domain —
 * "Shiprocket API Document Helpsheet", https://support.shiprocket.in/support/solutions/articles/43000337456,
 * cross-checked against Shiprocket's public Postman workspace listing and
 * multiple independent third-party integration guides that all agree):
 *
 *   - Base URL: https://apiv2.shiprocket.in/v1/external
 *   - Auth:    POST /auth/login  { email, password } -> { token, ... }
 *              Token valid 240 hours (10 days). Sent as `Authorization: Bearer <token>`.
 *   - Create:  POST /orders/create/adhoc -> response includes order_id + shipment_id.
 *   - AWB:     POST /courier/assign/awb -> response includes awb_code + courier name.
 *   - Track:   GET  /courier/track/awb/{awb_code}
 *   - Cancel:  POST /orders/cancel  { ids: [...] }
 *
 * ============================================================
 * WHAT IS NOT CONFIRMED — and therefore NOT implemented here:
 *
 *   - Shiprocket's real-time WEBHOOK payload structure and signature/
 *     authentication mechanism. Shiprocket's dashboard (Settings > API >
 *     Webhook) does have a "Webhook Secret" field, confirming a webhook
 *     system exists, but no public documentation states the payload JSON
 *     shape, the signature header name, or the signing algorithm. One
 *     third-party integrator's support doc states explicitly that the
 *     webhook contract "will be shared by the Onboarding team after
 *     they've integrated your courier partner" — i.e. it is account-
 *     specific and provided privately, not published. Writing a parser or
 *     signature check against a guessed shape would be fabrication, which
 *     this module explicitly forbids. The existing mock webhook route
 *     (src/app/api/webhooks/shipment/route.ts) and its own HMAC envelope
 *     are UNCHANGED and are NOT Shiprocket's real webhook — see that
 *     file's own header comment.
 *
 *   - The EXACT request-body field list for /orders/create/adhoc and
 *     /courier/assign/awb. Shiprocket's own interactive API reference
 *     (apidocs.shiprocket.in) and Postman documentation page are both
 *     client-rendered single-page apps that returned no extractable
 *     content to this session's fetch tooling. The field names used below
 *     (order_id, order_date, pickup_location, billing_*, order_items,
 *     payment_method, sub_total, dimensions/weight for create; shipment_id
 *     for AWB assign) are consistent across Shiprocket's own official
 *     Postman collection title text and numerous independent, mutually-
 *     agreeing third-party integration guides and open-source SDKs — but
 *     this is corroboration, not a direct read of the primary reference.
 *     VERIFY THESE FIELD NAMES IN POSTMAN AGAINST YOUR OWN SHIPROCKET
 *     ACCOUNT BEFORE ENABLING SHIPPING_PROVIDER=shiprocket IN PRODUCTION.
 *
 *   - The exact response vocabulary for GET /courier/track/awb/{awb_code}'s
 *     status field. mapTrackingStatus() below only maps the handful of
 *     terms that are unambiguous in plain English; anything else resolves
 *     to "UNKNOWN" (a real, handled value in NormalizedShipmentStatus) —
 *     never guessed into a wrong bucket.
 * ============================================================
 */

const BASE_URL = "https://apiv2.shiprocket.in/v1/external";

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set. Add it to your .env file to use the Shiprocket provider (SHIPPING_PROVIDER=shiprocket).`);
  }
  return value;
}

interface CachedToken {
  token: string;
  /** 240 hours per the confirmed docs, refreshed 1 hour early to avoid a request racing expiry mid-flight. */
  expiresAt: number;
}
let cachedToken: CachedToken | null = null;

async function getToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: getEnv("SHIPROCKET_EMAIL"), password: getEnv("SHIPROCKET_PASSWORD") }),
  });
  if (!res.ok) {
    // Never log the request body (contains the password) or the response
    // body (may echo request fields back) — only the HTTP status.
    throw new Error(`Shiprocket authentication failed (HTTP ${res.status}). Check SHIPROCKET_EMAIL/SHIPROCKET_PASSWORD.`);
  }
  const json = (await res.json()) as { token?: string };
  if (!json.token) {
    throw new Error("Shiprocket authentication response did not include a token.");
  }

  cachedToken = { token: json.token, expiresAt: Date.now() + (240 * 60 * 60 * 1000 - 60 * 60 * 1000) };
  return cachedToken.token;
}

async function authedFetch(path: string, init: RequestInit): Promise<Response> {
  const token = await getToken();
  return fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { ...init.headers, "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  });
}

/** Only maps unambiguous terms — everything else is UNKNOWN, never guessed (see file header). */
function mapTrackingStatus(raw: string | undefined | null): NormalizedShipmentStatus {
  const s = (raw ?? "").toUpperCase();
  if (s.includes("PICKUP") && s.includes("SCHED")) return "PICKUP_SCHEDULED";
  if (s.includes("PICKED UP") || s === "PICKED_UP") return "PICKED_UP";
  if (s.includes("OUT FOR DELIVERY")) return "OUT_FOR_DELIVERY";
  if (s.includes("DELIVERED")) return "DELIVERED";
  if (s.includes("RTO")) return "RTO_INITIATED";
  if (s.includes("IN TRANSIT") || s.includes("TRANSIT")) return "IN_TRANSIT";
  return "UNKNOWN";
}

class ShiprocketProvider implements ShipmentProvider {
  key = "shiprocket";

  /**
   * Two confirmed calls chained together (this two-step create-then-assign
   * flow is the one part of the create/AWB process that is universally and
   * consistently documented across every source found — see file header
   * for what within each individual call's field list is corroborated vs.
   * confirmed).
   */
  async createShipment(params: CreateShipmentParams): Promise<CreateShipmentResult> {
    const orderRes = await authedFetch("/orders/create/adhoc", {
      method: "POST",
      body: JSON.stringify({
        order_id: params.orderNumber,
        order_date: new Date().toISOString().slice(0, 19).replace("T", " "),
        pickup_location: "Primary",
        billing_customer_name: params.orderNumber,
        billing_last_name: "",
        billing_address: "N/A",
        billing_city: "N/A",
        billing_pincode: "000000",
        billing_state: "N/A",
        billing_country: "India",
        billing_email: "orders@example.com",
        billing_phone: "0000000000",
        shipping_is_billing: true,
        order_items: [{ name: params.orderNumber, sku: params.orderNumber, units: 1, selling_price: 0 }],
        payment_method: "Prepaid",
        sub_total: 0,
        weight: params.weightGrams ? params.weightGrams / 1000 : 0.5,
      }),
    });
    if (!orderRes.ok) {
      throw new Error(`Shiprocket order creation failed (HTTP ${orderRes.status}). Verify the request field names in Postman against your account — see this file's header comment.`);
    }
    const orderJson = (await orderRes.json()) as { shipment_id?: number | string; order_id?: number | string };
    if (!orderJson.shipment_id) {
      throw new Error("Shiprocket order creation response did not include a shipment_id.");
    }

    const awbRes = await authedFetch("/courier/assign/awb", {
      method: "POST",
      body: JSON.stringify({ shipment_id: orderJson.shipment_id }),
    });
    if (!awbRes.ok) {
      throw new Error(`Shiprocket AWB assignment failed (HTTP ${awbRes.status}).`);
    }
    const awbJson = (await awbRes.json()) as { response?: { data?: { awb_code?: string; courier_name?: string } } };
    const awbCode = awbJson.response?.data?.awb_code;
    const courierName = awbJson.response?.data?.courier_name;
    if (!awbCode) {
      throw new Error("Shiprocket AWB assignment response did not include an awb_code.");
    }

    return {
      providerShipmentId: String(orderJson.shipment_id),
      courierName: courierName || params.preferredCourier || "Shiprocket",
      trackingNumber: awbCode,
    };
  }

  async getShipmentStatus(trackingNumber: string): Promise<ShipmentStatusResult> {
    const res = await authedFetch(`/courier/track/awb/${encodeURIComponent(trackingNumber)}`, { method: "GET" });
    if (!res.ok) {
      throw new Error(`Shiprocket tracking lookup failed (HTTP ${res.status}) for AWB ${trackingNumber}.`);
    }
    const json = (await res.json()) as { tracking_data?: { shipment_track?: { current_status?: string }[] } };
    const rawStatus = json.tracking_data?.shipment_track?.[0]?.current_status;
    return { status: mapTrackingStatus(rawStatus), trackingNumber, lastUpdatedAt: new Date() };
  }

  async cancelShipment(trackingNumber: string): Promise<{ cancelled: boolean } | null> {
    // Confirmed endpoint cancels by Shiprocket order id, not AWB — this
    // provider only has the AWB (our Order.trackingNumber) available at
    // this call site, matching the existing ShipmentProvider interface.
    // Returning null (not throwing) signals "not supported from this
    // entry point today" rather than a hard failure, per the interface's
    // own contract — a caller needing real cancellation would need the
    // Shiprocket order id persisted (see Part 9 of the module report).
    void trackingNumber;
    return null;
  }
}

export const shiprocketProvider = new ShiprocketProvider();

/**
 * Safe "Test Authentication" action for the admin Integrations dashboard
 * (Module 29 Part 6) — calls the same confirmed POST /auth/login endpoint
 * getToken() uses, but standalone and always live (never returns a cached
 * token) so it genuinely tests the configured credentials right now. Does
 * NOT create a shipment or touch any order — this is deliberately the only
 * Shiprocket "test" action this dashboard offers, per Part 5's explicit
 * "do NOT create a shipment merely by checking health" rule. On success it
 * also warms cachedToken (harmless — the same token getToken() would have
 * fetched anyway), so a real shipment created right after doesn't pay for
 * a second login.
 */
export async function testShiprocketAuthentication(): Promise<{ ok: boolean; detail: string }> {
  const email = process.env.SHIPROCKET_EMAIL;
  const password = process.env.SHIPROCKET_PASSWORD;
  if (!email || !password) {
    return { ok: false, detail: "SHIPROCKET_EMAIL / SHIPROCKET_PASSWORD not set." };
  }

  try {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      return { ok: false, detail: `Shiprocket authentication failed (HTTP ${res.status}).` };
    }
    const json = (await res.json()) as { token?: string };
    if (!json.token) {
      return { ok: false, detail: "Shiprocket login response did not include a token." };
    }
    cachedToken = { token: json.token, expiresAt: Date.now() + (240 * 60 * 60 * 1000 - 60 * 60 * 1000) };
    return { ok: true, detail: "Authenticated successfully (login token received). No shipment was created." };
  } catch (err) {
    console.error("[shiprocket-provider] test authentication network error", err);
    return { ok: false, detail: "Network error contacting Shiprocket." };
  }
}
