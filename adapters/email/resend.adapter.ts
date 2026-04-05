import type { EmailAdapter, EmailSendInput, EmailSendResult } from "./base";

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? "";
const EMAIL_FROM = process.env.EMAIL_FROM ?? "noreply@example.com";

/**
 * Resend email adapter.
 * Docs: https://resend.com/docs/api-reference/emails/send-email
 */
class ResendAdapter implements EmailAdapter {
  async send(input: EmailSendInput): Promise<EmailSendResult> {
    if (!RESEND_API_KEY) {
      console.warn("[resend] RESEND_API_KEY not set — skipping email send");
      return {};
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: input.to,
        subject: input.subject,
        html: input.html,
        ...(input.text ? { text: input.text } : {}),
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Resend API error ${res.status}: ${body}`);
    }

    const data = (await res.json()) as { id?: string };
    return { providerId: data.id };
  }
}

export const resendAdapter: EmailAdapter = new ResendAdapter();
