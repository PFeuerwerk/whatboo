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
var WhatsappService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsappService = void 0;
const common_1 = require("@nestjs/common");
const reservation_engine_service_1 = require("../../reservations/services/reservation-engine.service");
let WhatsappService = WhatsappService_1 = class WhatsappService {
    constructor(reservationEngine) {
        this.reservationEngine = reservationEngine;
        this.logger = new common_1.Logger(WhatsappService_1.name);
    }
    async handleIncoming(body, signature) {
        try {
            const message = this.extractMessage(body);
            if (!message) {
                this.logger.debug('No message found in webhook payload');
                return;
            }
            this.logger.log(`Inbound message from ${message.from}: ${message.text}`);
            await this.processMessage(message);
        }
        catch (error) {
            this.logger.error('Error processing inbound WhatsApp message', error);
        }
    }
    extractMessage(body) {
        try {
            const entry = body.entry?.[0];
            const changes = entry?.changes?.[0];
            const value = changes?.value;
            const messages = value?.messages;
            const msg = messages?.[0];
            if (!msg)
                return null;
            return {
                from: msg.from,
                text: msg.text?.body,
                messageId: msg.id,
            };
        }
        catch {
            return null;
        }
    }
    async processMessage(message) {
        this.logger.log(`Processing message from ${message.from}: "${message.text}"`);
    }
};
exports.WhatsappService = WhatsappService;
exports.WhatsappService = WhatsappService = WhatsappService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [reservation_engine_service_1.ReservationEngineService])
], WhatsappService);
//# sourceMappingURL=whatsapp.service.js.map