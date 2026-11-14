import "server-only";
import { prisma } from "@/lib/prisma";
import type { IntegrationTestMetadata } from "@/lib/admin/activity-log";

/**
 * Central integration-health/status service (Module 29 Part 2) — the ONLY
 * place that decides an integration's readiness state. The admin dashboard
 * page and every card component read from this file; none of them re-derive
 * status logic themselves.
 *
 * Deliberately has NO dedicated database table (Part 14 — "prefer no schema
 * changes... do not add a table merely to store health-check information").
 * Two data sources instead:
 *   1. process.env — read live, every call, never cached across requests.
 *   2. ActivityLog — the existing table, reused exactly the way Module 22
 *      intended ("auditable via existing conventions"), to answer "when was
 *      this last tested and did it pass" without inventing new storage.
 *
 * IMPORTANT: readiness never automatically reaches PRODUCTION_READY. Per the
 * module's explicit rule ("do not claim production-ready merely because the
 * architecture exists or env vars are set"), this service has no code path
 * that emits PRODUCTION_READY — it is included in the type only so the UI
 * can render it if a human, off-system process (a real completed checkout +
 * refund cycle, confirmed manually) ever justifies updating this file later.
 * That is a deliberate, disclosed limitation, not an oversight.
 */

export type ReadinessState =
  | "NOT_CONFIGURED"
  | "CONFIGURED_NOT_TESTED"
  | "TEST_FAILED"
  | "TEST_PASSED"
  | "PARTIALLY_IMPLEMENTED"
  | "MOCK_ONLY"
  | "PRODUCTION_READY";

const READINESS_LABELS: Record<ReadinessState, string> = {
  NOT_CONFIGURED: "Not Configured",
  CONFIGURED_NOT_TESTED: "Configured — Not Tested",
  TEST_FAILED: "Test Failed",
  TEST_PASSED: "Test Passed",
  PARTIALLY_IMPLEMENTED: "Partially Implemented",
  MOCK_ONLY: "Mock Only",
  PRODUCTION_READY: "Production Ready",
};

export type IntegrationKey = "razorpay_payment" | "razorpay_refund" | "shiprocket" | "email" | "whatsapp";

export interface LastTestInfo {
  at: Date;
  result: "success" | "failure";
  detail?: string;
}

export interface IntegrationAction {
  key: string;
  label: string;
  endpoint: string;
  method: "POST";
  /** Whether clicking this button contacts a real external provider (Part 6 — must always be disclosed). */
  isRealSideEffect: boolean;
  description: string;
}

export interface IntegrationStatus {
  key: IntegrationKey;
  name: string;
  currentProvider: string;
  modeLabel: string;
  modeIsMock: boolean;
  modeWarning?: string;
  implementationStatus: "Complete" | "Partial" | "Console/mock only";
  implementationNote?: string;
  credentialStatus: "Configured" | "Missing" | "Partially configured" | "Not applicable";
  missingConfig: string[];
  readiness: ReadinessState;
  readinessLabel: string;
  lastTest: LastTestInfo | null;
  actions: IntegrationAction[];
  notes: string[];
}

async function getLastTests(): Promise<Map<string, LastTestInfo>> {
  const rows = await prisma.activityLog.findMany({
    where: { entity: "Integration" },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { entityId: true, createdAt: true, metadata: true },
  });

  const map = new Map<string, LastTestInfo>();
  for (const row of rows) {
    if (!row.entityId || map.has(row.entityId)) continue;
    const meta = row.metadata as unknown as IntegrationTestMetadata | null;
    if (!meta || typeof meta.result !== "string") continue;
    map.set(row.entityId, { at: row.createdAt, result: meta.result, detail: meta.detail });
  }
  return map;
}

function razorpayCredentialFields() {
  return {
    RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
    RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
    NEXT_PUBLIC_RAZORPAY_KEY_ID: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET,
  };
}

function buildRazorpayPaymentStatus(lastTests: Map<string, LastTestInfo>): IntegrationStatus {
  const fields = razorpayCredentialFields();
  const missing = Object.entries(fields)
    .filter(([, v]) => !v)
    .map(([k]) => k);
  const keyPairConfigured = !!fields.RAZORPAY_KEY_ID && !!fields.RAZORPAY_KEY_SECRET;
  const allConfigured = missing.length === 0;

  const credentialStatus = allConfigured ? "Configured" : missing.length === Object.keys(fields).length ? "Missing" : "Partially configured";

  const lastTest = lastTests.get("razorpay_payment") ?? null;
  let readiness: ReadinessState;
  if (!keyPairConfigured) {
    readiness = "NOT_CONFIGURED";
  } else if (lastTest?.result === "success") {
    readiness = "TEST_PASSED";
  } else if (lastTest?.result === "failure") {
    readiness = "TEST_FAILED";
  } else {
    readiness = "CONFIGURED_NOT_TESTED";
  }

  const notes: string[] = [
    'No mock mode exists for Razorpay payments — when RAZORPAY_KEY_ID/SECRET are set, checkout calls the REAL Razorpay API immediately. There is no separate "test mode" switch in this codebase; using Razorpay TEST keys vs LIVE keys is entirely determined by which key pair you paste into RAZORPAY_KEY_ID/SECRET.',
    "\"Test Passed\" above only means the configured credentials authenticate against Razorpay's API (a read-only check). It does NOT mean a real checkout, signature verification, or webhook has been tested end-to-end — those require completing a real payment.",
  ];
  if (keyPairConfigured && !fields.RAZORPAY_WEBHOOK_SECRET) {
    notes.push("RAZORPAY_WEBHOOK_SECRET is not set — incoming webhooks will fail signature verification until it is configured to match the secret entered in the Razorpay Dashboard's webhook settings.");
  }

  return {
    key: "razorpay_payment",
    name: "Razorpay Payments",
    currentProvider: "Razorpay",
    modeLabel: keyPairConfigured ? "REAL — calls Razorpay's live API" : "INACTIVE — credentials missing, payment creation will fail",
    modeIsMock: false,
    implementationStatus: "Complete",
    credentialStatus,
    missingConfig: missing,
    readiness,
    readinessLabel: READINESS_LABELS[readiness],
    lastTest,
    actions: [
      {
        key: "verify_credentials",
        label: "Verify Razorpay Credentials",
        endpoint: "/api/admin/integrations/razorpay/verify-credentials",
        method: "POST",
        isRealSideEffect: true,
        description: "Makes a real, read-only call to Razorpay's API (list payments, count=1) to confirm your key ID/secret are valid. Creates nothing.",
      },
    ],
    notes,
  };
}

function buildRazorpayRefundStatus(lastTests: Map<string, LastTestInfo>): IntegrationStatus {
  const fields = razorpayCredentialFields();
  const missing = Object.entries(fields)
    .filter(([, v]) => !v)
    .map(([k]) => k);
  const keyPairConfigured = !!fields.RAZORPAY_KEY_ID && !!fields.RAZORPAY_KEY_SECRET;
  const allConfigured = missing.length === 0;
  const credentialStatus = allConfigured ? "Configured" : missing.length === Object.keys(fields).length ? "Missing" : "Partially configured";

  // Reuses the SAME credential check as payments (identical key pair) —
  // deliberately not a second "verify" button, to avoid implying refunds
  // use different credentials.
  const paymentTest = lastTests.get("razorpay_payment") ?? null;
  let readiness: ReadinessState;
  if (!keyPairConfigured) {
    readiness = "NOT_CONFIGURED";
  } else if (paymentTest?.result === "success") {
    readiness = "TEST_PASSED";
  } else if (paymentTest?.result === "failure") {
    readiness = "TEST_FAILED";
  } else {
    readiness = "CONFIGURED_NOT_TESTED";
  }

  return {
    key: "razorpay_refund",
    name: "Razorpay Refunds",
    currentProvider: "Razorpay",
    modeLabel: keyPairConfigured ? "REAL — calls Razorpay's live refund API" : "INACTIVE — credentials missing, refund initiation will fail",
    modeIsMock: false,
    implementationStatus: "Complete",
    credentialStatus,
    missingConfig: missing,
    readiness,
    readinessLabel: READINESS_LABELS[readiness],
    lastTest: paymentTest,
    actions: [],
    notes: [
      "Credential status mirrors Razorpay Payments above — refunds use the exact same RAZORPAY_KEY_ID/SECRET pair. Use the \"Verify Razorpay Credentials\" action on the Payments card; there is no separate refund credential check.",
      "A real end-to-end refund cannot be tested without a real captured payment to refund — this cannot happen until a real online payment has actually been completed. There is no safe way to automate this.",
      "Local logic (eligibility rules, idempotency, ActivityLog, notifications, and — using a real, correctly-signed refund.processed/refund.failed webhook payload with synthetic data — the full webhook-driven completion path) was verified in Module 28. Re-run `npm run simulate:razorpay-refund` anytime to reverify; this dashboard does not re-run it automatically.",
    ],
  };
}

function buildShiprocketStatus(lastTests: Map<string, LastTestInfo>): IntegrationStatus {
  const selected = process.env.SHIPPING_PROVIDER || "mock";
  const email = process.env.SHIPROCKET_EMAIL;
  const password = process.env.SHIPROCKET_PASSWORD;
  const missing: string[] = [];
  if (!email) missing.push("SHIPROCKET_EMAIL");
  if (!password) missing.push("SHIPROCKET_PASSWORD");

  const isMock = selected === "mock";
  const isShiprocket = selected === "shiprocket";
  const credentialsPresent = !!email && !!password;
  const credentialStatus = credentialsPresent ? "Configured" : missing.length === 2 ? "Missing" : "Partially configured";

  let modeLabel: string;
  let modeWarning: string | undefined;
  if (isMock) {
    modeLabel = "MOCK / LOCAL TESTING";
    modeWarning = "No real courier will be contacted. SHIPPING_PROVIDER is \"mock\" (the default) — every shipment action uses the local mock provider.";
  } else if (isShiprocket) {
    modeLabel = "SHIPROCKET";
    modeWarning = credentialsPresent
      ? undefined
      : "SHIPPING_PROVIDER=shiprocket but SHIPROCKET_EMAIL/PASSWORD are missing — any real shipment action will fail loudly (there is no silent fallback to mock).";
  } else {
    modeLabel = `UNKNOWN ("${selected}")`;
    modeWarning = `SHIPPING_PROVIDER="${selected}" is not a recognized value. Use "mock" or "shiprocket" — any other value fails loudly at request time.`;
  }

  const lastTest = lastTests.get("shiprocket") ?? null;

  return {
    key: "shiprocket",
    name: "Shiprocket",
    currentProvider: isShiprocket ? "Shiprocket" : isMock ? "Mock (local)" : selected,
    modeLabel,
    modeIsMock: isMock,
    modeWarning,
    // Fixed characterization (Part 2's own example) — real webhook contract
    // is not implemented, so this never reads "Complete" regardless of
    // credentials or test results.
    implementationStatus: "Partial",
    implementationNote: "Order creation, AWB assignment, and tracking lookup are implemented against Shiprocket's confirmed REST contract. The real Shiprocket webhook (payload shape + signature mechanism) is NOT implemented — Shiprocket does not publish it; it is shared privately per-account during onboarding. See shiprocket-provider.ts's header comment for exactly what is confirmed vs. corroborated.",
    credentialStatus,
    missingConfig: missing,
    readiness: "PARTIALLY_IMPLEMENTED",
    readinessLabel: READINESS_LABELS.PARTIALLY_IMPLEMENTED,
    lastTest,
    actions: [
      {
        key: "test_auth",
        label: "Test Authentication",
        endpoint: "/api/admin/integrations/shiprocket/test-auth",
        method: "POST",
        isRealSideEffect: true,
        description: "Makes a real call to Shiprocket's login endpoint using your configured credentials. Does NOT create a shipment or touch any order.",
      },
    ],
    notes: [
      "Even with SHIPPING_PROVIDER=shiprocket and valid credentials, this integration stays \"Partially Implemented\" — that reflects the missing real webhook contract and unverified create/AWB field names, not a credential problem.",
      "The exact request-body field names for order/AWB creation are corroborated from Shiprocket's own Postman collection and third-party guides, not read directly from Shiprocket's interactive API reference (a client-rendered SPA this session's tooling could not extract). Verify field names in Postman against your own account before relying on this in production.",
    ],
  };
}

function buildEmailStatus(lastTests: Map<string, LastTestInfo>): IntegrationStatus {
  const selected = process.env.EMAIL_PROVIDER || "console";
  const isConsole = selected === "console";
  const lastTest = lastTests.get("email") ?? null;

  return {
    key: "email",
    name: "Email",
    currentProvider: isConsole ? "Console (local logging only)" : selected,
    modeLabel: isConsole ? "MOCK / LOCAL TESTING (console only)" : `UNKNOWN ("${selected}")`,
    modeIsMock: isConsole,
    modeWarning: isConsole
      ? "No real email is ever sent. EMAIL_PROVIDER is \"console\" (the default) — every notification is printed to the server log instead."
      : `EMAIL_PROVIDER="${selected}" has no implementation yet. Only "console" is currently supported — getEmailProvider() will throw at send time, not silently fall back to console.`,
    implementationStatus: "Console/mock only",
    implementationNote: "Provider factory, event wiring, and templates are fully built. No real provider (Resend/SES/SendGrid/SMTP) has been implemented or activated — only the console stub exists.",
    credentialStatus: isConsole ? "Not applicable" : "Missing",
    missingConfig: isConsole ? [] : ["EMAIL_API_KEY (and a real provider implementation, which does not exist yet)"],
    readiness: isConsole ? "MOCK_ONLY" : "NOT_CONFIGURED",
    readinessLabel: READINESS_LABELS[isConsole ? "MOCK_ONLY" : "NOT_CONFIGURED"],
    lastTest,
    actions: [
      {
        key: "test_send",
        label: "Send Test Email",
        endpoint: "/api/admin/integrations/email/test-send",
        method: "POST",
        isRealSideEffect: false,
        description: "Sends a test message through the currently configured provider. Only the console provider is implemented, so this prints to the server console/log — no real email is sent to anyone.",
      },
    ],
    notes: ["Activating a real provider requires implementing a new NotificationChannelProvider (see providers/email.ts) and installing/configuring that provider's SDK — this module does not do that without your explicit approval, per the \"do not install a provider SDK\" constraint."],
  };
}

function buildWhatsAppStatus(lastTests: Map<string, LastTestInfo>): IntegrationStatus {
  const selected = process.env.WHATSAPP_PROVIDER || "console";
  const isConsole = selected === "console";
  const lastTest = lastTests.get("whatsapp") ?? null;

  return {
    key: "whatsapp",
    name: "WhatsApp",
    currentProvider: isConsole ? "Console (local logging only)" : selected,
    modeLabel: isConsole ? "MOCK / LOCAL TESTING (console only)" : `UNKNOWN ("${selected}")`,
    modeIsMock: isConsole,
    modeWarning: isConsole
      ? "No real WhatsApp message is ever sent. WHATSAPP_PROVIDER is \"console\" (the default) — every notification is printed to the server log instead (with the phone number masked)."
      : `WHATSAPP_PROVIDER="${selected}" has no implementation yet. Only "console" is currently supported — getWhatsAppProvider() will throw at send time, not silently fall back to console.`,
    implementationStatus: "Console/mock only",
    implementationNote: "Provider factory, event wiring, and templates are fully built. No real provider (Meta Cloud API/Twilio) has been implemented or activated — only the console stub exists.",
    credentialStatus: isConsole ? "Not applicable" : "Missing",
    missingConfig: isConsole ? [] : ["WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID (and a real provider implementation, which does not exist yet)"],
    readiness: isConsole ? "MOCK_ONLY" : "NOT_CONFIGURED",
    readinessLabel: READINESS_LABELS[isConsole ? "MOCK_ONLY" : "NOT_CONFIGURED"],
    lastTest,
    actions: [
      {
        key: "test_send",
        label: "Send Test WhatsApp",
        endpoint: "/api/admin/integrations/whatsapp/test-send",
        method: "POST",
        isRealSideEffect: false,
        description: "Sends a test message through the currently configured provider. Only the console provider is implemented, so this prints to the server console/log — no real WhatsApp message is sent to anyone.",
      },
    ],
    notes: ["Activating a real provider requires implementing a new NotificationChannelProvider (see providers/whatsapp.ts), a Meta/Twilio business account, and approved message templates — this module does not do that without your explicit approval."],
  };
}

export async function getIntegrationStatuses(): Promise<IntegrationStatus[]> {
  const lastTests = await getLastTests();
  return [
    buildRazorpayPaymentStatus(lastTests),
    buildRazorpayRefundStatus(lastTests),
    buildShiprocketStatus(lastTests),
    buildEmailStatus(lastTests),
    buildWhatsAppStatus(lastTests),
  ];
}
