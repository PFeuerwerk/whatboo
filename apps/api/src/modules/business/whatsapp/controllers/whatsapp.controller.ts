import { Controller, Get, Post, Body, Query, Headers, HttpCode, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WhatsappService } from '../services/whatsapp.service';

@Controller('whatsapp')
export class WhatsappController {
  constructor(
    private readonly whatsappService: WhatsappService,
    private readonly configService: ConfigService,
  ) {}

  // Meta webhook verification handshake
  @Get('webhook')
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ): string {
    const verifyToken = this.configService.get<string>('WHATSAPP_VERIFY_TOKEN');

    if (mode === 'subscribe' && token === verifyToken) {
      return challenge;
    }

    throw new UnauthorizedException('Webhook verification failed');
  }

  // Inbound messages from Meta
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async receiveMessage(
    @Body() body: Record<string, unknown>,
    @Headers('x-hub-signature-256') signature: string,
  ): Promise<{ status: string }> {
    await this.whatsappService.handleIncoming(body, signature);
    return { status: 'ok' };
  }
}
