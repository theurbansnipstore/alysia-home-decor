import { requireRole } from "@/lib/session";
import { INTEGRATION_AREA_ROLES } from "@/lib/admin/integration-roles";
import { getIntegrationStatuses } from "@/lib/integrations/integration-status";
import { ACTIVATION_CHECKLISTS } from "@/lib/integrations/activation-checklists";
import IntegrationCard from "@/components/admin/integrations/IntegrationCard";

/**
 * Admin "Production Integrations" control center (Module 29). Server
 * component — reads live status directly from integration-status.ts, the
 * single source of truth every card renders from. No client-side status
 * computation exists anywhere in this page.
 */
export default async function AdminIntegrationsPage() {
  await requireRole(INTEGRATION_AREA_ROLES);
  const statuses = await getIntegrationStatuses();

  return (
    <div>
      <h1 className="mb-1 font-display text-2xl text-ink">Production Integrations</h1>
      <p className="mb-6 max-w-3xl text-sm text-ink-500">
        What&apos;s actually implemented, what&apos;s configured, and what has been tested against a real provider — kept as three separate questions on
        purpose. A green &quot;Test Passed&quot; badge means a specific, narrow check succeeded; it is never a claim that the whole integration is
        production-ready.
      </p>

      <div className="mb-6 border border-ink-900 bg-ink px-4 py-3 text-sm text-bone-100">
        This application currently has <strong>no real Razorpay, Shiprocket, Email, or WhatsApp production credentials configured</strong>. Every
        integration below is either inactive or running in mock/console mode. Nothing on this page will move real money or contact a real customer
        unless you explicitly click a labeled test action.
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {statuses.map((status) => (
          <IntegrationCard
            key={status.key}
            status={{ ...status, lastTest: status.lastTest ? { ...status.lastTest, at: status.lastTest.at.toISOString() } : null }}
            checklist={ACTIVATION_CHECKLISTS[status.key]}
          />
        ))}
      </div>

      <section className="mt-10 border border-ink-100 bg-bone p-5">
        <h2 className="mb-3 font-display text-lg text-ink">Webhook & Setup Guide</h2>

        <div className="space-y-5 text-sm text-ink-700">
          <div>
            <h3 className="mb-1 font-medium text-ink">Razorpay webhook</h3>
            <p>
              In the Razorpay Dashboard, go to <strong>Settings → Webhooks</strong> and add an endpoint pointing at{" "}
              <code className="bg-bone-100 px-1">{`{NEXT_PUBLIC_SITE_URL}/api/payment/razorpay/webhook`}</code>. Enable at minimum{" "}
              <code className="bg-bone-100 px-1">payment.captured</code>, <code className="bg-bone-100 px-1">payment.failed</code>,{" "}
              <code className="bg-bone-100 px-1">refund.processed</code>, and <code className="bg-bone-100 px-1">refund.failed</code>. Copy the
              webhook secret Razorpay generates into <code className="bg-bone-100 px-1">RAZORPAY_WEBHOOK_SECRET</code> — it must match exactly, or
              every webhook delivery will fail signature verification (by design; this app never accepts an unsigned or mis-signed webhook).
            </p>
          </div>

          <div>
            <h3 className="mb-1 font-medium text-ink">Shiprocket webhook</h3>
            <p>
              Shiprocket&apos;s real webhook payload structure and signature mechanism are <strong>not publicly documented</strong> — Shiprocket
              shares this contract privately, per-account, during onboarding (their own support docs say as much). This application does{" "}
              <strong>not</strong> implement a real Shiprocket webhook receiver today, and will not fabricate one. When your onboarding team shares
              the exact payload shape and signing method, that is a new, scoped piece of work — implement it from that real document, not from a
              guess. Until then, shipment status changes must be applied manually via the admin Order detail page&apos;s status update form, or the
              order&apos;s tracking can be checked with the (implemented, confirmed) tracking lookup endpoint.
            </p>
          </div>

          <div>
            <h3 className="mb-1 font-medium text-ink">Email</h3>
            <p>
              No real email provider is implemented yet. Activating one is two steps: (1) implement a new{" "}
              <code className="bg-bone-100 px-1">NotificationChannelProvider</code> (see <code className="bg-bone-100 px-1">providers/email.ts</code>{" "}
              for the interface the console stub already satisfies) against a real provider such as Resend, SES, SendGrid, or SMTP; (2) set{" "}
              <code className="bg-bone-100 px-1">EMAIL_PROVIDER</code> to that provider&apos;s key. No provider SDK is installed by this module —
              that requires your explicit approval first, since it&apos;s a new dependency and a paid service.
            </p>
          </div>

          <div>
            <h3 className="mb-1 font-medium text-ink">WhatsApp</h3>
            <p>
              Same shape as email: implement a real <code className="bg-bone-100 px-1">NotificationChannelProvider</code> against a WhatsApp
              Business API provider (Meta Cloud API or Twilio are the common choices), with approved message templates and a verified business
              phone number, then set <code className="bg-bone-100 px-1">WHATSAPP_PROVIDER</code> accordingly.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
