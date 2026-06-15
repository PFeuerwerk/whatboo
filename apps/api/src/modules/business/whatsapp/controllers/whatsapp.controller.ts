import { PhoneValidationService } from "../../../../common/phone/phone-validation.service";
import { PrismaService } from "../../../../infrastructure/database/prisma.service";
import { Controller, Get, Post, Body, Query, Headers, HttpCode, HttpStatus, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WhatsappService } from '../services/whatsapp.service';
import { WhatsappVerifyDto } from '../dto/whatsapp-verify.dto';
import { WhatsappQueue } from '../../../../queues/whatsapp.queue';

@Controller('whatsapp')
export class WhatsappController {
  constructor(
    private readonly whatsappService: WhatsappService,
    private readonly configService: ConfigService,
    private readonly whatsappQueue: WhatsappQueue,
    private readonly phoneValidationService: PhoneValidationService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Handshake de verificación obligatorio para Meta Developers.
   * Ruta: GET /api/v1/whatsapp/webhook
   */
  @Get('webhook')
  verifyWebhook(@Query() query: WhatsappVerifyDto): string {
    const verifyToken = this.configService.get<string>('WHATSAPP_VERIFY_TOKEN');
    
    const mode = query['hub.mode'];
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];

    if (mode === 'subscribe' && token === verifyToken) {
      return challenge;
    }

    throw new UnauthorizedException('La verificación del Webhook de WhatsApp ha fallado.');
  }

  /**
   * Endpoint receptor de mensajes entrantes desde Meta.
   * Encola el cuerpo del webhook en BullMQ/Redis de forma asíncrona.
   * Ruta: POST /api/v1/whatsapp/webhook
   */
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async receiveMessage(
    @Body() body: Record<string, any>,
    @Headers('x-hub-signature-256') signature: string,
  ): Promise<{ status: string }> {
    
    const appSecret = this.configService.get<string>('WHATSAPP_APP_SECRET');

    if (appSecret && !signature) {
      throw new BadRequestException('Firma criptográfica x-hub-signature-256 ausente.');
    }

    const payload = body as Record<string, unknown>;
      
    // Interceptar estados de error de entrega enviados por Meta Cloud API
    const statusObject = (payload as any)?.entry?.[0]?.changes?.[0]?.value?.statuses?.[0];
    if (statusObject?.status === "failed") {
      const errorCode = statusObject?.errors?.[0]?.code || "UNKNOWN_META_ERROR";
      const errorTitle = statusObject?.errors?.[0]?.title || "Fallo de entrega de Meta";
      const recipientPhone = statusObject?.recipient_id;

      // Corregido: Ajustado al 100% con las columnas reales de tu schema.prisma (Sin la propiedad payload huérfana)
      await this.prisma.whatsappInboundLog.create({
        data: {
          rawPhoneNumber: recipientPhone || "UNKNOWN",
          isValid: false,
          reason: `META_DELIVERY_FAILED_${errorCode}`,
          errorMessage: `${errorTitle} | Body: ${JSON.stringify(payload).slice(0, 200)}`,
        },
      });

      return { status: "meta_error_logged" };
    }

    // 1. Validar la procedencia de Meta en el perímetro HTTP de forma síncrona y rápida
    this.whatsappService.validateSignature(payload, signature);

    // Extracción defensiva del número del remitente de Meta
    const entry = (payload as any)?.entry?.[0];
    const change = entry?.changes?.[0];
    const messageObject = change?.value?.messages?.[0];
    const rawPhoneNumber = messageObject?.from;

    if (rawPhoneNumber) {
      const metadataEntry = (payload as any)?.entry?.[0]?.changes?.[0]?.value?.metadata;
      const businessPhone = metadataEntry?.display_phone_number || "";
      
      // Detección automática del país del restaurante emisor para Fallback contextual
      let restaurantCountryFallback = "ES";
      if (businessPhone.startsWith("52")) restaurantCountryFallback = "MX";
      else if (businessPhone.startsWith("56")) restaurantCountryFallback = "CL";
      else if (businessPhone.startsWith("1")) restaurantCountryFallback = "US";

      const validation = this.phoneValidationService.validate(rawPhoneNumber, restaurantCountryFallback);
      if (!validation.isValid) {
        const friendlyError = this.phoneValidationService.getFriendlyError(validation.reason || "INVALID_PHONE");
        
        // Corregido: Removido el campo payload inexistente para blindar la transacción de Prisma
        await this.prisma.whatsappInboundLog.create({
          data: {
            rawPhoneNumber: rawPhoneNumber,
            isValid: false,
            reason: validation.reason || "INVALID_PHONE",
            errorMessage: `${friendlyError.message} | Body: ${JSON.stringify(payload).slice(0, 200)}`,
          },
        });

        return {
          status: "rejected",
          ...friendlyError
        } as any;
      }
    }

    // 2. Encolar en Redis para procesamiento asíncrono pesado de fondo mediante BullMQ
    await this.whatsappQueue.addJob(payload);
    
    return { status: "ok" };
  }

  @Post("test-message")
  async testMessage(
    @Body() body: Record<string, any>,
  ): Promise<{ status: string }> {
    await this.whatsappService.handleIncoming(body, "");
    return { status: "processed" };
  }
}
