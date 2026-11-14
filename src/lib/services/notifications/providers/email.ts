import "server-only";
import type { NotificationChannelProvider, SendNotificationParams } from "@/lib/services/notifications/types";
import { renderTemplatePreview } from "@/lib/services/notifications/providers/template-preview";

/**
 * Stub — logs instead of sending. Swap for real SMTP/SendGrid/SES later;
 * the event wiring in index.ts doesn't change. Deliberately logs the full
 * rendered preview (not just raw variables) — for password.reset in
 * particular, this is what makes local password-reset testing possible
 * without a real email provider: the full, clickable reset link is printed
 * plainly here (dev-only; never do this in a real provider implementation).
 */
class ConsoleEmailProvider implements NotificationChannelProvider {
  channel = "email" as const;

  async send(params: SendNotificationParams): Promise<void> {
    console.log(
      `[notifications:email] event=${params.eventType ?? "(none)"} template="${params.template}" to=${params.to.email ?? "(no email)"}\n` +
        `  variables: ${JSON.stringify(params.data)}\n` +
        `  message preview: ${renderTemplatePreview(params.template, params.data)}`
    );
  }
}

export const emailProvider = new ConsoleEmailProvider();
