import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as handlebars from 'handlebars';
import * as nodemailer from 'nodemailer';
import * as path from 'path';
import { IEmailService, SendEmailOptions, SendRenderedEmailOptions } from './email-service.interface';

@Injectable()
export class EmailService implements IEmailService, OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transporter!: nodemailer.Transporter;
  private readonly templateCache = new Map<string, HandlebarsTemplateDelegate>();

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    if (this.configService.get<string>('NODE_ENV') === 'test') {
      this.transporter = nodemailer.createTransport({ jsonTransport: true });
      this.logger.log('Servicio SMTP inicializado con transporte JSON para entorno test.');
      return;
    }

    const host = this.configService.get<string>('SMTP_HOST', 'localhost');
    const port = this.configService.get<number>('SMTP_PORT', 1025);
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');
    const secure = this.configService.get<boolean>('SMTP_SECURE', false);
    const maxConnections = this.configService.get<number>('SMTP_MAX_CONNECTIONS', 5);
    const maxMessages = this.configService.get<number>('SMTP_MAX_MESSAGES', 100);
    const connectionTimeout = this.configService.get<number>('SMTP_CONNECTION_TIMEOUT_MS', 10000);

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
      pool: true,
      maxConnections,
      maxMessages,
      connectionTimeout,
    });

    if (this.configService.get<boolean>('SMTP_VERIFY_ON_START', false)) {
      const health = await this.checkHealth();
      if (health.status === 'up') {
        this.logger.log(`Conexion SMTP establecida en ${host}:${port}`);
      } else {
        this.logger.warn(`SMTP no disponible al arranque: ${health.error}`);
      }
      return;
    }

    this.logger.log(`Servicio SMTP configurado en ${host}:${port}. Verificacion inicial desactivada.`);
  }

  async checkHealth(): Promise<{ status: 'up' | 'down'; host: string; port: number; error?: string }> {
    const host = this.configService.get<string>('SMTP_HOST', 'localhost');
    const port = this.configService.get<number>('SMTP_PORT', 1025);

    try {
      await this.transporter.verify();
      return { status: 'up', host, port };
    } catch (error) {
      return {
        status: 'down',
        host,
        port,
        error: error instanceof Error ? error.message : 'Error SMTP desconocido',
      };
    }
  }

  async sendMail(options: SendEmailOptions): Promise<void> {
    const html = await this.renderTemplate(options.templateName, options.context);
    await this.sendRenderedMail({
      to: options.to,
      subject: options.subject,
      html,
      replyTo: options.replyTo,
      traceId: options.traceId,
    });
  }

  async sendRenderedMail(options: SendRenderedEmailOptions): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.resolveFrom(),
        to: this.normalizeRecipients(options.to),
        replyTo: options.replyTo ?? this.configService.get<string>('EMAIL_REPLY_TO') ?? undefined,
        subject: options.subject,
        html: options.html,
      });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`No se pudo enviar el correo. Trace: ${options.traceId ?? 'n/a'} Error: ${errMsg}`);
      throw error;
    }
  }

  private async renderTemplate(templateName: string, context: Record<string, unknown>): Promise<string> {
    const normalizedName = templateName.replace(/\.hbs$/, '');
    const cached = this.templateCache.get(normalizedName);
    if (cached) {
      return cached(context);
    }

    const templatePath = await this.resolveTemplatePath(normalizedName);
    const templateContent = await fs.readFile(templatePath, 'utf-8');
    const compiledTemplate = handlebars.compile(templateContent, { strict: true });
    this.templateCache.set(normalizedName, compiledTemplate);
    return compiledTemplate(context);
  }

  private async resolveTemplatePath(templateName: string): Promise<string> {
    const templateDir = this.configService.get<string>('EMAIL_TEMPLATE_DIR');
    const candidates = [
      templateDir ? path.join(templateDir, `${templateName}.hbs`) : undefined,
      path.join(__dirname, 'templates', `${templateName}.hbs`),
      path.join(process.cwd(), 'dist', 'integrations', 'email', 'templates', `${templateName}.hbs`),
      path.join(process.cwd(), 'src', 'integrations', 'email', 'templates', `${templateName}.hbs`),
    ].filter((candidate): candidate is string => Boolean(candidate));

    for (const candidate of candidates) {
      try {
        await fs.access(candidate);
        return candidate;
      } catch {
        // Try next location. Runtime images can copy templates into dist or configure EMAIL_TEMPLATE_DIR.
      }
    }

    throw new Error(`Plantilla de email no encontrada: ${templateName}`);
  }

  private resolveFrom(): string | { name: string; address: string } {
    const address = this.configService.get<string>('EMAIL_FROM', 'no-reply@whatboo.local');
    const name = this.configService.get<string>('EMAIL_FROM_NAME', 'Whatboo');
    return name ? { name, address } : address;
  }

  private normalizeRecipients(to: SendEmailOptions['to']): nodemailer.SendMailOptions['to'] {
    if (!Array.isArray(to)) {
      return to;
    }

    return to.map((recipient) => {
      if (typeof recipient === 'string') {
        return recipient;
      }
      return {
        name: recipient.name,
        address: recipient.email,
      };
    });
  }
}
