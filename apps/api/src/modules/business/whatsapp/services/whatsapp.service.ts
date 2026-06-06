import { Injectable, Logger } from '@nestjs/common';
import { ReservationEngineService } from '../../reservations/services/reservation-engine.service';

interface WhatsappMessage {
  from: string;
  text: string;
  messageId: string;
}

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(
    private readonly reservationEngine: ReservationEngineService,
  ) {}

  async handleIncoming(
    body: Record<string, unknown>,
    signature: string,
  ): Promise<void> {
    try {
      const message = this.extractMessage(body);
      if (!message) {
        this.logger.debug('No message found in webhook payload');
        return;
      }

      this.logger.log(`Inbound message from ${message.from}: ${message.text}`);

      // Route to reservation engine
      // Full intent parsing will be added in next phase
      await this.processMessage(message);
    } catch (error) {
      this.logger.error('Error processing inbound WhatsApp message', error);
    }
  }

  private extractMessage(body: Record<string, unknown>): WhatsappMessage | null {
    try {
      const entry = (body.entry as Record<string, unknown>[])?.[0];
      const changes = (entry?.changes as Record<string, unknown>[])?.[0];
      const value = changes?.value as Record<string, unknown>;
      const messages = value?.messages as Record<string, unknown>[];
      const msg = messages?.[0];

      if (!msg) return null;

      return {
        from: msg.from as string,
        text: (msg.text as Record<string, unknown>)?.body as string,
        messageId: msg.id as string,
      };
    } catch {
      return null;
    }
  }

  private async processMessage(message: WhatsappMessage): Promise<void> {
    // Conversation state is managed in Redis (post-MVP)
    // For now: log and acknowledge
    this.logger.log(`Processing message from ${message.from}: "${message.text}"`);
  }
}
