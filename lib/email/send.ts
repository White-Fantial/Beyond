/**
 * Email delivery service.
 * Sends emails via the configured adapter and logs delivery to EmailLog.
 */
import { prisma } from "@/lib/prisma";
import { resendAdapter } from "@/adapters/email/resend.adapter";
import type { EmailAdapter, EmailSendInput } from "@/adapters/email/base";

let _adapter: EmailAdapter = resendAdapter;

/** Override the adapter (used in tests). */
export function setEmailAdapter(adapter: EmailAdapter) {
  _adapter = adapter;
}

export interface SendEmailOptions extends EmailSendInput {
  template: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  let providerId: string | undefined;
  let status: "SENT" | "FAILED" = "SENT";
  let errorMessage: string | undefined;

  try {
    const result = await _adapter.send({
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
    providerId = result.providerId;
  } catch (err) {
    status = "FAILED";
    errorMessage = err instanceof Error ? err.message : String(err);
    console.error("[email] Send failed:", errorMessage);
  }

  await prisma.emailLog.create({
    data: {
      to: options.to,
      subject: options.subject,
      template: options.template,
      status,
      errorMessage: errorMessage ?? null,
      providerId: providerId ?? null,
    },
  });
}
