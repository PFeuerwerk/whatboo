import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WhatsappService } from '../modules/business/whatsapp/services/whatsapp.service';
import { DashboardGateway } from "../infrastructure/observability/events/dashboard.gateway";
export declare class WhatsappWorker implements OnModuleInit, OnModuleDestroy {
    private readonly configService;
    private readonly whatsappService;
    private readonly dashboardGateway;
    private readonly logger;
    private worker;
    private redisConnection;
    constructor(configService: ConfigService, whatsappService: WhatsappService, dashboardGateway: DashboardGateway);
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
}
