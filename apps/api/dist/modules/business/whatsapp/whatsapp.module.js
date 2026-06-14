"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsappModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_module_1 = require("../../../infrastructure/database/prisma.module");
const whatsapp_controller_1 = require("./controllers/whatsapp.controller");
const whatsapp_service_1 = require("./services/whatsapp.service");
const whatsapp_client_service_1 = require("./services/whatsapp-client.service");
const reservations_module_1 = require("../reservations/reservations.module");
const ai_module_1 = require("../../../integrations/ai/ai.module");
const availability_module_1 = require("../availability/availability.module");
const customers_module_1 = require("../customers/customers.module");
const phone_validation_service_1 = require("../../../common/phone/phone-validation.service");
const whatsapp_queue_1 = require("../../../queues/whatsapp.queue");
const whatsapp_worker_1 = require("../../../workers/whatsapp.worker");
let WhatsappModule = class WhatsappModule {
};
exports.WhatsappModule = WhatsappModule;
exports.WhatsappModule = WhatsappModule = __decorate([
    (0, common_1.Module)({
        imports: [
            prisma_module_1.PrismaModule,
            reservations_module_1.ReservationsModule,
            config_1.ConfigModule,
            ai_module_1.AiModule,
            availability_module_1.AvailabilityModule,
            customers_module_1.CustomersModule,
        ],
        controllers: [
            whatsapp_controller_1.WhatsappController,
        ],
        providers: [
            whatsapp_service_1.WhatsappService,
            whatsapp_client_service_1.WhatsappClientService,
            whatsapp_queue_1.WhatsappQueue,
            whatsapp_worker_1.WhatsappWorker,
            phone_validation_service_1.PhoneValidationService,
        ],
        exports: [
            whatsapp_client_service_1.WhatsappClientService,
        ],
    })
], WhatsappModule);
//# sourceMappingURL=whatsapp.module.js.map