"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const phone_validation_module_1 = require("./common/phone/phone-validation.module");
const prisma_module_1 = require("./infrastructure/database/prisma.module");
const redis_module_1 = require("./infrastructure/cache/redis.module");
const events_module_1 = require("./infrastructure/observability/events/events.module");
const env_validation_1 = require("./config/env.validation");
const ai_module_1 = require("./integrations/ai/ai.module");
const restaurants_module_1 = require("./modules/business/restaurants/restaurants.module");
const customers_module_1 = require("./modules/business/customers/customers.module");
const availability_module_1 = require("./modules/business/availability/availability.module");
const reservations_module_1 = require("./modules/business/reservations/reservations.module");
const whatsapp_module_1 = require("./modules/business/whatsapp/whatsapp.module");
const users_module_1 = require("./modules/business/users/users.module");
const health_module_1 = require("./modules/platform/health/health.module");
const auth_module_1 = require("./modules/platform/auth/auth.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: '.env',
                validationSchema: env_validation_1.envValidationSchema,
            }),
            prisma_module_1.PrismaModule,
            redis_module_1.RedisModule,
            events_module_1.EventsModule,
            phone_validation_module_1.PhoneValidationModule,
            ai_module_1.AiModule,
            auth_module_1.AuthModule,
            restaurants_module_1.RestaurantsModule,
            customers_module_1.CustomersModule,
            availability_module_1.AvailabilityModule,
            reservations_module_1.ReservationsModule,
            whatsapp_module_1.WhatsappModule,
            users_module_1.UsersModule,
            health_module_1.HealthModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map