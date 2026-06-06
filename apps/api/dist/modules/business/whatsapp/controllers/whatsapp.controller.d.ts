import { ConfigService } from '@nestjs/config';
import { WhatsappService } from '../services/whatsapp.service';
export declare class WhatsappController {
    private readonly whatsappService;
    private readonly configService;
    constructor(whatsappService: WhatsappService, configService: ConfigService);
    verifyWebhook(mode: string, token: string, challenge: string): string;
    receiveMessage(body: Record<string, unknown>, signature: string): Promise<{
        status: string;
    }>;
}
