import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from "../../../../infrastructure/database/prisma.service";
import axios from "axios";
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WhatsappClientService {
  private readonly logger =
    new Logger(
      WhatsappClientService.name,
    );

  private readonly apiVersion =
    'v19.0';

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Envía un mensaje de texto libre a WhatsApp
   */
    async sendMessage(
      toPhoneNumber: string,
      textBody: string,
    ): Promise<void> {
      const accessToken = this.configService.get<string>("WHATSAPP_ACCESS_TOKEN");
      const phoneNumberId = this.configService.get<string>("WHATSAPP_PHONE_NUMBER_ID");

      // Modo desarrollo (Simulación si faltan variables)
      if (!accessToken || !phoneNumberId) {
        this.logger.warn(`[SIMULACIÓN WHATSAPP] Destinatario: ${toPhoneNumber} | Mensaje: "${textBody}"`);
        return;
      }

      const url = `https://graph.facebook.com/${this.apiVersion}/${phoneNumberId}/messages`;
      
      // 1. Consultar de forma ágil el último mensaje de entrada exitoso para validar la ventana
      const lastLog = await this.prisma.whatsappInboundLog.findFirst({
        where: {
          rawPhoneNumber: toPhoneNumber,
          isValid: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const isInsideWindow = lastLog && lastLog.createdAt > twentyFourHoursAgo;

      // 2. Configurar el payload dinámico (Texto Plano vs HSM Template Fallback)
      const payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: toPhoneNumber.replace(/[^\d]/g, ""),
        ...(isInsideWindow
          ? {
              type: "text",
              text: { preview_url: false, body: textBody },
            }
          : {
              type: "template",
              template: {
                name: "reservation_update_notification",
                language: { code: "es" },
                components: [
                  {
                    type: "body",
                    parameters: [{ type: "text", text: textBody }],
                  },
                ],
              },
            }),
      };
    try {
      const response =
        await fetch(url, {
          method: 'POST',

          headers: {
            Authorization:
              `Bearer ${accessToken}`,

            'Content-Type':
              'application/json',
          },

          body: JSON.stringify(
            payload,
          ),
        });

      if (!response.ok) {
        const errorData =
          await response.json();

        this.logger.error(
          `Fallo de la API de Meta al enviar mensaje: ${JSON.stringify(
            errorData,
          )}`,
        );

        return;
      }

      this.logger.log(
        `Mensaje enviado con éxito vía WhatsApp API a: ${toPhoneNumber}`,
      );
    } catch (error) {
      const msg =
        error instanceof Error
          ? error.message
          : 'Error de red';

      this.logger.error(
        `Error de conexión con los servidores de WhatsApp API: ${msg}`,
      );
    }
  }

  /**
   * Normaliza el teléfono eliminando
   * espacios, paréntesis, guiones, etc.
   */
  private normalizePhoneNumber(
    phone: string,
  ): string {
    return phone.replace(
      /\D/g,
      '',
    );
  }
}