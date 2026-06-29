import { Injectable, Logger, OnModuleInit, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IEmailService, SendEmailOptions } from './email-service.interface';
import * as nodemailer from 'nodemailer';
import * as handlebars from 'handlebars';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class EmailService implements IEmailService, OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  // Corregido: Se añade el operador '!' para inicialización definitiva estricta
  private transporter!: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
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

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
    });

    this.transporter.verify((error) => {
      if (error) {
        this.logger.error(`Fallo en la conexión del servidor SMTP de Correo: ${error.message}`);
      } else {
        this.logger.log(`Conexión con el servidor SMTP establecida con éxito en ${host}:${port}`);
      }
    });
  }

  async sendMail(options: SendEmailOptions): Promise<void> {
    const from = this.configService.get<string>('EMAIL_FROM', 'no-reply@restaurant-booking.local');
    
    try {
      await this.transporter.sendMail({
        from,
        to: options.to,
        subject: options.subject,
        html: options.template,
      });
    } catch (error) {
      // Corregido: Mapeo seguro de tipo 'unknown' a Error string
      const errMsg = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`No se pudo enviar el correo a ${options.to}: ${errMsg}`);
      throw error;
    }
  }

  async sendPasswordResetMail(
    email: string,
    restaurantName: string,
    resetLink: string,
  ): Promise<void> {
    const subject = `Restablecer contraseña - ${restaurantName}`;
    
    try {
      const templatePath = path.join(
        __dirname,
        'templates',
        'auth',
        'forgot-password.hbs',
      );

      const templateContent = await fs.readFile(templatePath, 'utf-8');
      const compiledTemplate = handlebars.compile(templateContent);
      const htmlOutput = compiledTemplate({ restaurantName, resetLink });

      await this.sendMail({
        to: email,
        subject,
        template: htmlOutput,
        context: {},
      });

    } catch (error) {
      // Corregido: Mapeo seguro de tipo 'unknown' a Error string
      const errMsg = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`Fallo al compilar o enviar plantilla de recuperación: ${errMsg}`);
      throw new InternalServerErrorException('Error en la infraestructura de mensajería.');
    }
  }
}
