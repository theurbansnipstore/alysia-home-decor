import "server-only";

/**
 * Safe, read-only Razorpay credential verification (Module 29 Part 5).
 * Uses GET /v1/payments?count=1 — Razorpay's own long-standing, widely
 * documented "Fetch all Payments" endpoint. This is one of Razorpay's most
 * basic REST endpoints and is corroborated across their own docs and every
 * mainstream integration guide, but — consistent with this codebase's
 * "don't fabricate a contract" rule — it was not re-fetched from
 * razorpay.com in this specific module's session the way the refund
 * contract was in Module 28. It is a plain read with no side effects: it
 * does not create, capture, or modify anything. A 200 response proves the
 * configured key_id/key_secret pair is valid and accepted by Razorpay's
 * server; a 401 proves it is not. This intentionally does NOT prove an
 * end-to-end checkout works — it only proves the credentials authenticate.
 * VERIFY THIS ENDPOINT IN RAZORPAY'S DASHBOARD/DOCS ONCE YOU HAVE REAL
 * CREDENTIALS, same caveat as shiprocket-provider.ts's header comment.
 * Never logs the response body (real order/payment data belonging to the
 * account) — only the HTTP status.
 */
export interface RazorpayCredentialCheckResult {
  ok: boolean;
  detail: string;
}

export async function checkRazorpayCredentials(): Promise<RazorpayCredentialCheckResult> {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    return { ok: false, detail: "RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET not set." };
  }

  const basicAuth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  try {
    const res = await fetch("https://api.razorpay.com/v1/payments?count=1", {
      method: "GET",
      headers: { Authorization: `Basic ${basicAuth}` },
    });
    if (res.ok) {
      return { ok: true, detail: "Credentials accepted by Razorpay (HTTP 200 on a read-only call)." };
    }
    if (res.status === 401) {
      return { ok: false, detail: "Razorpay rejected the credentials (HTTP 401 — invalid key ID/secret)." };
    }
    return { ok: false, detail: `Razorpay returned HTTP ${res.status}.` };
  } catch (err) {
    console.error("[razorpay-health] network error", err);
    return { ok: false, detail: "Network error contacting Razorpay." };
  }
}
