"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReservationsModule = void 0;
const common_1 = require("@nestjs/common");
const reservation_repository_1 = require("./repositories/reservation.repository");
const reservation_engine_service_1 = require("./services/reservation-engine.service");
const availability_module_1 = require("../availability/availability.module");
const customers_module_1 = require("../customers/customers.module");
let ReservationsModule = class ReservationsModule {
};
exports.ReservationsModule = ReservationsModule;
exports.ReservationsModule = ReservationsModule = __decorate([
    (0, common_1.Module)({
        imports: [availability_module_1.AvailabilityModule, customers_module_1.CustomersModule],
        providers: [reservation_repository_1.ReservationRepository, reservation_engine_service_1.ReservationEngineService],
        exports: [reservation_repository_1.ReservationRepository, reservation_engine_service_1.ReservationEngineService],
    })
], ReservationsModule);
//# sourceMappingURL=reservations.module.js.map