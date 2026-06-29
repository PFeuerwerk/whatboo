import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { CountryCode } from 'libphonenumber-js';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { PhoneValidationService } from '../../../../common/phone/phone-validation.service';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { WhatsappQueue } from '../../../../queues/whatsapp.queue';
import { WhatsappVerifyDto } from '../dto/whatsapp-verify.dto';
import { WhatsappService } from '../services/whatsapp.service';
import { whatsappWebhookSchema, WhatsappWebhookPayload } from '../validators/whatsapp-webhook.schema';

@Controller('whatsapp')
export class WhatsappController {
  constructor(
    private readonly whatsappService: WhatsappService,
    private readonly configService: ConfigService,
    private readonly whatsappQueue: WhatsappQueue,
    private readonly phoneValidationService: PhoneValidationService,
    private readonly prisma: PrismaService,
  ) {}

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

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    whatsappWebhook: {
      ttl: 60000,
      limit: 120,
      blockDuration: 300000,
    },
  })
  async receiveMessage(
    @Body() body: Record<string, unknown>,
    @Headers('x-hub-signature-256') signature?: string,
  ): Promise<{ status: string; message?: string }> {
    const appSecret = this.configService.get<string>('WHATSAPP_APP_SECRET');

    if (appSecret && !signature) {
      throw new BadRequestException('Firma criptográfica x-hub-signature-256 ausente.');
    }

    const payload = this.parseWebhookPayload(body ?? {});
    const prismaPayload = payload as Prisma.InputJsonObject;

    const statusObject = payload?.entry?.[0]?.changes?.[0]?.value?.statuses?.[0];
    if (statusObject?.status === 'failed') {
      const errorCode = statusObject?.errors?.[0]?.code || 'UNKNOWN_META_ERROR';
      const errorTitle = statusObject?.errors?.[0]?.title || 'Fallo de entrega de Meta';
      const recipientPhone = statusObject?.recipient_id || 'UNKNOWN';

      await this.prisma.whatsappInboundLog.create({
        data: {
          rawPhoneNumber: recipientPhone,
          payload: prismaPayload,
          isValid: false,
          reason: `META_DELIVERY_FAILED_${errorCode}`,
          errorMessage: `${errorTitle} | Body: ${JSON.stringify(payload).slice(0, 200)}`,
        },
      });

      return { status: 'meta_error_logged' };
    }

    this.whatsappService.validateSignature(payload, signature ?? '');

    const entry = payload?.entry?.[0];
    const change = entry?.changes?.[0];
    const messageObject = change?.value?.messages?.[0];
    const rawPhoneNumber = messageObject?.from;

    if (rawPhoneNumber) {
      const metadataEntry = change?.value?.metadata;
      const businessPhone = metadataEntry?.display_phone_number || '';

      let restaurantCountryFallback = 'ES';
      if (businessPhone.startsWith('52')) restaurantCountryFallback = 'MX';
      else if (businessPhone.startsWith('56')) restaurantCountryFallback = 'CL';
      else if (businessPhone.startsWith('1')) restaurantCountryFallback = 'US';

      const validation = this.phoneValidationService.validate(
        rawPhoneNumber,
        restaurantCountryFallback as CountryCode,
      );

      if (!validation.isValid) {
        const friendlyError = this.phoneValidationService.getFriendlyError(
          validation.reason || 'INVALID_PHONE',
        );

        await this.prisma.whatsappInboundLog.create({
          data: {
            rawPhoneNumber,
            payload: prismaPayload,
            isValid: false,
            reason: validation.reason || 'INVALID_PHONE',
            errorMessage: `${friendlyError.message} | Body: ${JSON.stringify(payload).slice(0, 200)}`,
          },
        });

        return {
          status: 'rejected',
          message: friendlyError.message,
        };
      }
    }

    await this.whatsappQueue.addJob(payload);

    return { status: 'ok' };
  }

  private parseWebhookPayload(body: Record<string, unknown>): WhatsappWebhookPayload {
    try {
      return whatsappWebhookSchema.parse(body);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException({
          message: 'Payload de WhatsApp estructuralmente inválido.',
          issues: error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        });
      }

      throw error;
    }
  }

  @Post('test-message')
  async testMessage(
    @Body() body: Record<string, any>,
  ): Promise<{ status: string }> {
    await this.whatsappService.handleIncoming(body, '');
    return { status: 'processed' };
  }
}
