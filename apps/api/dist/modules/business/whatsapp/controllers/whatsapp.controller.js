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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsappController = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const whatsapp_service_1 = require("../services/whatsapp.service");
const whatsapp_verify_dto_1 = require("../dto/whatsapp-verify.dto");
const whatsapp_queue_1 = require("../../../../queues/whatsapp.queue");
const phone_validation_service_1 = require("../../../../common/phone/phone-validation.service");
const prisma_service_1 = require("../../../../infrastructure/database/prisma.service");
let WhatsappController = class WhatsappController {
    constructor(whatsappService, configService, whatsappQueue, phoneValidationService, prisma) {
        this.whatsappService = whatsappService;
        this.configService = configService;
        this.whatsappQueue = whatsappQueue;
        this.phoneValidationService = phoneValidationService;
        this.prisma = prisma;
    }
    verifyWebhook(query) {
        const verifyToken = this.configService.get('WHATSAPP_VERIFY_TOKEN');
        const mode = query['hub.mode'];
        const token = query['hub.verify_token'];
        const challenge = query['hub.challenge'];
        if (mode === 'subscribe' && token === verifyToken) {
            return challenge;
        }
        throw new common_1.UnauthorizedException('La verificación del Webhook de WhatsApp ha fallado.');
    }
    async receiveMessage(body, signature) {
        const appSecret = this.configService.get('WHATSAPP_APP_SECRET');
        if (appSecret &&
            !signature) {
            throw new common_1.BadRequestException('Firma criptográfica x-hub-signature-256 ausente.');
        }
        const payload = body;
        const statusObject = payload?.entry?.[0]?.changes?.[0]?.value?.statuses?.[0];
        if (statusObject?.status === "failed") {
            const errorCode = statusObject?.errors?.[0]?.code || "UNKNOWN_META_ERROR";
            const errorTitle = statusObject?.errors?.[0]?.title || "Fallo de entrega de Meta";
            const recipientPhone = statusObject?.recipient_id;
            await this.prisma.whatsappInboundLog.create({
                data: {
                    rawPhoneNumber: recipientPhone || "UNKNOWN",
                    isValid: false,
                    reason: `META_DELIVERY_FAILED_${errorCode}`,
                    errorMessage: errorTitle,
                    payload: payload,
                },
            });
            return { status: "meta_error_logged" };
        }
        this.whatsappService.validateSignature(payload, signature);
        const entry = payload?.entry?.[0];
        const change = entry?.changes?.[0];
        const messageObject = change?.value?.messages?.[0];
        const rawPhoneNumber = messageObject?.from;
        if (rawPhoneNumber) {
            const metadataEntry = payload?.entry?.[0]?.changes?.[0]?.value?.metadata;
            const businessPhone = metadataEntry?.display_phone_number || "";
            let restaurantCountryFallback = "ES";
            if (businessPhone.startsWith("52"))
                restaurantCountryFallback = "MX";
            else if (businessPhone.startsWith("56"))
                restaurantCountryFallback = "CL";
            else if (businessPhone.startsWith("1"))
                restaurantCountryFallback = "US";
            const validation = this.phoneValidationService.validate(rawPhoneNumber, restaurantCountryFallback);
            if (!validation.isValid) {
                const friendlyError = this.phoneValidationService.getFriendlyError(validation.reason || "INVALID_PHONE");
                await this.prisma.whatsappInboundLog.create({
                    data: {
                        rawPhoneNumber: rawPhoneNumber,
                        isValid: false,
                        reason: validation.reason || "INVALID_PHONE",
                        errorMessage: friendlyError.message,
                        payload: payload,
                    },
                });
                return {
                    status: "rejected",
                    ...friendlyError
                };
            }
        }
        await this.whatsappQueue.addJob(payload);
        return { status: "ok" };
    }
    async testMessage(body) {
        await this.whatsappService.handleIncoming(body, "");
        return { status: "processed" };
    }
};
exports.WhatsappController = WhatsappController;
__decorate([
    (0, common_1.Get)('webhook'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [whatsapp_verify_dto_1.WhatsappVerifyDto]),
    __metadata("design:returntype", String)
], WhatsappController.prototype, "verifyWebhook", null);
__decorate([
    (0, common_1.Post)('webhook'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)('x-hub-signature-256')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], WhatsappController.prototype, "receiveMessage", null);
__decorate([
    (0, common_1.Post)("test-message"),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WhatsappController.prototype, "testMessage", null);
exports.WhatsappController = WhatsappController = __decorate([
    (0, common_1.Controller)('whatsapp'),
    __metadata("design:paramtypes", [whatsapp_service_1.WhatsappService,
        config_1.ConfigService,
        whatsapp_queue_1.WhatsappQueue,
        phone_validation_service_1.PhoneValidationService,
        prisma_service_1.PrismaService])
], WhatsappController);
//# sourceMappingURL=whatsapp.controller.js.map