"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var WhatsappWorker_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsappWorker = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const bullmq_1 = require("bullmq");
const whatsapp_service_1 = require("../modules/business/whatsapp/services/whatsapp.service");
const whatsapp_queue_1 = require("../queues/whatsapp.queue");
const dashboard_gateway_1 = require("../infrastructure/observability/events/dashboard.gateway");
const ioredis_1 = __importDefault(require("ioredis"));
let WhatsappWorker = WhatsappWorker_1 = class WhatsappWorker {
    constructor(configService, whatsappService, dashboardGateway) {
        this.configService = configService;
        this.whatsappService = whatsappService;
        this.dashboardGateway = dashboardGateway;
        this.logger = new common_1.Logger(WhatsappWorker_1.name);
    }
    async onModuleInit() {
        const redisHost = this.configService.get('REDIS_HOST', 'localhost');
        const redisPort = this.configService.get('REDIS_PORT', 6379);
        this.redisConnection = new ioredis_1.default({
            host: redisHost,
            port: redisPort,
            maxRetriesPerRequest: null,
        });
        this.worker = new bullmq_1.Worker(whatsapp_queue_1.WHATSAPP_QUEUE_NAME, async (job) => {
            this.logger.debug(`[WORKER] Procesando Job ID: ${job.id} de la cola de WhatsApp...`);
            await this.whatsappService.handleIncoming(job.data, '');
        }, {
            connection: this.redisConnection,
            concurrency: 5,
            autorun: true,
        });
        this.worker.on("completed", (job) => {
            this.logger.log(`[WORKER SUCCESS] Job ID ${job.id} procesado con éxito. Reserva y respuesta despachadas.`);
        });
        this.worker.on("failed", (job, error) => {
            this.logger.error(`[WORKER CRITICAL] Job ID ${job?.id} ha fallado de forma definitiva: ${error?.message || "Error desconocido"}`);
            const payload = job?.data;
            const metadata = payload?.entry?.[0]?.changes?.[0]?.value?.metadata;
            const displayPhone = metadata?.display_phone_number || "GLOBAL";
            this.dashboardGateway.emitToRestaurant(displayPhone, "whatsapp_queue_error", {
                jobId: job?.id,
                errorMessage: error?.message || "Error desconocido",
                timestamp: new Date().toISOString(),
            });
        });
        this.logger.log(`Worker asíncrono de WhatsApp activado y escuchando Redis de fondo.`);
    }
    async onModuleDestroy() {
        if (this.worker) {
            await this.worker.close();
        }
        if (this.redisConnection) {
            await this.redisConnection.quit();
        }
        this.logger.log('Worker de WhatsApp apagado correctamente de la memoria.');
    }
};
exports.WhatsappWorker = WhatsappWorker;
exports.WhatsappWorker = WhatsappWorker = WhatsappWorker_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        whatsapp_service_1.WhatsappService,
        dashboard_gateway_1.DashboardGateway])
], WhatsappWorker);
//# sourceMappingURL=whatsapp.worker.js.map