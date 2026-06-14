import { ConfigService } from '@nestjs/config';
import { WhatsappService } from '../services/whatsapp.service';
import { WhatsappVerifyDto } from '../dto/whatsapp-verify.dto';
import { WhatsappQueue } from '../../../../queues/whatsapp.queue';
import { PhoneValidationService } from "../../../../common/phone/phone-validation.service";
import { PrismaService } from "../../../../infrastructure/database/prisma.service";
export declare class WhatsappController {
    private readonly whatsappService;
    private readonly configService;
    private readonly whatsappQueue;
    private readonly phoneValidationService;
    private readonly prisma;
    constructor(whatsappService: WhatsappService, configService: ConfigService, whatsappQueue: WhatsappQueue, phoneValidationService: PhoneValidationService, prisma: PrismaService);
    verifyWebhook(query: WhatsappVerifyDto): string;
    receiveMessage(body: Record<string, any>, signature: string): Promise<{
        status: string;
    }>;
    testMessage(body: Record<string, any>): Promise<{
        status: string;
    }>;
}
