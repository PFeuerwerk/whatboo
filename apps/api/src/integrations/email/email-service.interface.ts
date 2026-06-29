export type EmailTemplateName = 'auth/forgot-password' | 'staff/invitation';

export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface SendEmailOptions {
  to: string | string[] | EmailRecipient[];
  subject: string;
  templateName: EmailTemplateName;
  context: Record<string, unknown>;
  restaurantId?: string;
  tenantId?: string;
  locale?: string;
  replyTo?: string;
  traceId?: string;
}

export interface SendRenderedEmailOptions {
  to: SendEmailOptions['to'];
  subject: string;
  html: string;
  replyTo?: string;
  traceId?: string;
}

export interface PasswordResetEmailJob {
  tenantId: string;
  restaurantId: string;
  templateName: 'auth/forgot-password';
  locale: string;
  to: string;
  restaurantName: string;
  resetLink: string;
  traceId: string;
  requestedAt: string;
}

export interface StaffInvitationEmailJob {
  tenantId: string;
  restaurantId: string;
  templateName: 'staff/invitation';
  locale: string;
  to: string;
  staffName: string;
  restaurantName: string;
  activationLink: string;
  traceId: string;
  invitedAt: string;
}

export type TransactionalEmailJob = PasswordResetEmailJob | StaffInvitationEmailJob;

export interface IEmailService {
  sendMail(options: SendEmailOptions): Promise<void>;
  sendRenderedMail(options: SendRenderedEmailOptions): Promise<void>;
}