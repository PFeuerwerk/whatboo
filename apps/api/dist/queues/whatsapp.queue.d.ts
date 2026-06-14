import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
export declare const WHATSAPP_QUEUE_NAME = "whatsapp-inbound-queue";
export declare class WhatsappQueue implements OnModuleInit {
    private readonly configService;
    private readonly logger;
    private queue;
    private redisConnection;
    constructor(configService: ConfigService);
    onModuleInit(): Promise<void>;
    addJob(payload: Record<string, unknown>): Promise<void>;
}
