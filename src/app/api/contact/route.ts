import { NextRequest } from "next/server";
import { contactFormSchema } from "@/lib/validations/contact";
import { apiSuccess, apiError } from "@/lib/api-response";

/**
 * No email/SMTP service exists in this project yet (the notifications bus
 * at src/lib/services/notifications/ is purpose-built for outbound
 * order/account lifecycle events, not inbound contact messages, and isn't
 * a fit here — and installing a new email service wasn't in scope for this
 * module). This logs the submission server-side, matching the same
 * "log instead of send" honesty already established by that notifications
 * stub, rather than pretending a message was emailed anywhere.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return apiError("Invalid request body", 400);

    const parsed = contactFormSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Please check the form and try again", 400, parsed.error.flatten().fieldErrors);
    }

    console.log("[contact form submission]", parsed.data);

    return apiSuccess({ received: true });
  } catch (err) {
    console.error("[POST /api/contact]", err);
    return apiError("Couldn't send your message. Please try again.", 500);
  }
}
