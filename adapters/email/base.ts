/**
 * Email adapter base interface.
 * All email provider adapters must implement this contract.
 */
export interface EmailSendInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailSendResult {
  providerId?: string;
}

export interface EmailAdapter {
  send(input: EmailSendInput): Promise<EmailSendResult>;
}
