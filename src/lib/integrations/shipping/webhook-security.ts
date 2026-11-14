import "server-only";
import { createHmac, timingSafeEqual } from "crypto";

/**
 * HMAC-SHA256 over the raw request body, mirroring the exact pattern
 * already proven for Razorpay's webhook (razorpay-client.ts /
 * verifyWebhookSignature, itself delegating to the Razorpay SDK's own
 * validateWebhookSignature). This is deliberately OUR OWN scheme, not
 * Shiprocket's — their real webhook signing mechanism hasn't been
 * confirmed against official documentation, so nothing here should be
 * mistaken for it. A future ShiprocketProvider's webhook handler would need
 * its own verification logic once that contract is known; this function
 * only secures the LOCAL mock envelope described in
 * src/app/api/webhooks/shipment/route.ts.
 */
function getSecret(): string {
  const secret = process.env.SHIPMENT_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("SHIPMENT_WEBHOOK_SECRET is not set. Add it to your .env file to use the shipment webhook.");
  }
  return secret;
}

export function signShipmentWebhookPayload(rawBody: string): string {
  return createHmac("sha256", getSecret()).update(rawBody).digest("hex");
}

export function verifyShipmentWebhookSignature(rawBody: string, signatureHeader: string): boolean {
  const expected = signShipmentWebhookPayload(rawBody);
  const expectedBuf = Buffer.from(expected, "hex");
  const providedBuf = Buffer.from(signatureHeader, "hex");
  if (expectedBuf.length !== providedBuf.length) return false;
  return timingSafeEqual(expectedBuf, providedBuf);
}
