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
var WhatsappQueue_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsappQueue = exports.WHATSAPP_QUEUE_NAME = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
exports.WHATSAPP_QUEUE_NAME = 'whatsapp-inbound-queue';
let WhatsappQueue = WhatsappQueue_1 = class WhatsappQueue {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(WhatsappQueue_1.name);
    }
    async onModuleInit() {
        const redisHost = this.configService.get('REDIS_HOST', 'localhost');
        const redisPort = this.configService.get('REDIS_PORT', 6379);
        this.redisConnection = new ioredis_1.default({
            host: redisHost,
            port: redisPort,
            maxRetriesPerRequest: null,
        });
        this.queue = new bullmq_1.Queue(exports.WHATSAPP_QUEUE_NAME, {
            connection: this.redisConnection,
            defaultJobOptions: {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 2000,
                },
                removeOnComplete: true,
                removeOnFail: false,
            },
        });
        this.logger.log(`Cola asíncrona de WhatsApp inicializada correctamente en Redis -> ${redisHost}:${redisPort}`);
    }
    async addJob(payload) {
        const jobId = payload['entry']?.[0]?.changes?.[0]?.value?.messages?.[0]?.id;
        await this.queue.add('process-webhook', payload, {
            jobId,
        });
        this.logger.debug(`Mensaje encolado de forma segura en Redis. Job ID: ${jobId}`);
    }
};
exports.WhatsappQueue = WhatsappQueue;
exports.WhatsappQueue = WhatsappQueue = WhatsappQueue_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], WhatsappQueue);
//# sourceMappingURL=whatsapp.queue.js.map