"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var WhatsappService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsappService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const reservation_engine_service_1 = require("../../reservations/services/reservation-engine.service");
const prisma_service_1 = require("../../../../infrastructure/database/prisma.service");
const whatsapp_client_service_1 = require("./whatsapp-client.service");
const ai_service_1 = require("../../../../integrations/ai/application/services/ai.service");
const availability_repository_1 = require("../../availability/repositories/availability.repository");
const customer_repository_1 = require("../../customers/repositories/customer.repository");
const reservation_repository_1 = require("../../reservations/repositories/reservation.repository");
const conversation_state_service_1 = require("../../../../integrations/ai/application/services/conversation-state.service");
const crypto = __importStar(require("crypto"));
const restaurant_timezone_util_1 = require("../../../../common/time/restaurant-timezone.util");
const phone_validation_service_1 = require("../../../../common/phone/phone-validation.service");
const groq_service_1 = require("../../../../integrations/ai/infrastructure/providers/groq.service");
const axios_1 = __importDefault(require("axios"));
let WhatsappService = WhatsappService_1 = class WhatsappService {
    normalizePhone(phone, context) {
        if (!phone) {
            this.logger.warn(`[PHONE] empty: ${context}`);
            return null;
        }
        const v = this.phoneValidationService.validate(phone);
        if (!v.isValid || !v.normalizedPhone) {
            this.logger.warn(`[PHONE INVALID] ${context}: ${phone}`);
            return null;
        }
        return String(v.normalizedPhone);
    }
    safePhone(phone) {
        if (!phone)
            return null;
        const v = this.phoneValidationService.validate(phone);
        if (!v.isValid || !v.normalizedPhone)
            return null;
        return String(v.normalizedPhone);
    }
    constructor(reservationEngine, configService, prisma, whatsappClient, aiService, conversationStateService, availabilityRepository, customerRepository, reservationRepository, phoneValidationService, groqService) {
        this.reservationEngine = reservationEngine;
        this.configService = configService;
        this.prisma = prisma;
        this.whatsappClient = whatsappClient;
        this.aiService = aiService;
        this.conversationStateService = conversationStateService;
        this.availabilityRepository = availabilityRepository;
        this.customerRepository = customerRepository;
        this.reservationRepository = reservationRepository;
        this.phoneValidationService = phoneValidationService;
        this.groqService = groqService;
        this.logger = new common_1.Logger(WhatsappService_1.name);
    }
    async handleIncoming(body, signature) {
        try {
            const message = this.extractMessage(body);
            if (!message) {
                this.logger.debug('No se encontró ningún mensaje de texto válido en el payload del webhook.');
                return;
            }
            this.logger.log(`Mensaje entrante de WhatsApp desde ${message.from} hacia ${message.toPhoneNumber}: ${message.text}`);
            if (message.audioId) {
                this.logger.log(`[Whisper STT] Detectada nota de voz. Descargando recurso Media ID: ${message.audioId}`);
                const token = this.configService.get("WHATSAPP_ACCESS_TOKEN");
                const mediaUrlResponse = await axios_1.default.get(`https://facebook.com{(message as any).audioId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const downloadUrl = mediaUrlResponse.data?.url;
                if (downloadUrl) {
                    const audioDownload = await axios_1.default.get(downloadUrl, {
                        headers: { Authorization: `Bearer ${token}` },
                        responseType: "arraybuffer"
                    });
                    const audioBuffer = Buffer.from(audioDownload.data);
                    const transcribedText = await this.groqService.transcribeAudioBuffer(audioBuffer, "voice.ogg");
                    this.logger.log(`[Whisper STT Result] Audio transcrito con éxito: "${transcribedText}"`);
                    message.text = transcribedText;
                }
                else {
                    throw new Error("No se pudo obtener la URL de descarga de audio desde Meta Cloud API.");
                }
            }
            await this.processMessage(message);
        }
        catch (error) {
            const errMsg = error instanceof Error
                ? error.message
                : 'Error desconocido';
            this.logger.error(`Fallo crítico al procesar el mensaje entrante de WhatsApp: ${errMsg}`, error);
        }
    }
    validateSignature(body, signature) {
        const appSecret = this.configService.get('WHATSAPP_APP_SECRET');
        if (!appSecret) {
            this.logger.warn('Falta configurar WHATSAPP_APP_SECRET en el entorno. Saltando validación criptográfica.');
            return;
        }
        try {
            const expectedSignature = signature.startsWith('sha256=')
                ? signature.substring(7)
                : signature;
            const rawBody = JSON.stringify(body);
            const actualSignature = crypto
                .createHmac('sha256', appSecret)
                .update(rawBody)
                .digest('hex');
            const isSignatureValid = crypto.timingSafeEqual(Buffer.from(actualSignature, 'utf-8'), Buffer.from(expectedSignature, 'utf-8'));
            if (!isSignatureValid) {
                throw new common_1.UnauthorizedException('La firma x-hub-signature-256 no coincide con el payload enviado.');
            }
        }
        catch {
            this.logger.error('Error durante la validación de la firma criptográfica de WhatsApp.');
            throw new common_1.UnauthorizedException('Fallo de validación de firma en la infraestructura de WhatsApp.');
        }
    }
    extractMessage(body) {
        try {
            const value = body?.entry?.[0]?.changes?.[0]?.value;
            const metadata = value?.metadata;
            const toPhoneNumber = metadata?.display_phone_number;
            const messages = value?.messages;
            const msg = messages?.[0];
            const isAudio = msg?.type === "audio";
            if (!msg || !toPhoneNumber || (msg.type !== "text" && !isAudio))
                return null;
            const fromPhone = this.safePhone(msg.from);
            const toPhone = this.safePhone(toPhoneNumber);
            if (!fromPhone || !toPhone)
                return null;
            return {
                from: fromPhone,
                toPhoneNumber: toPhone,
                text: isAudio ? null : msg.text?.body ?? null,
                audioId: isAudio ? msg.audio?.id ?? null : null,
                messageId: msg.id,
            };
        }
        catch {
            return null;
        }
    }
    async processMessage(message) {
        this.logger.log(`Buscando restaurante vinculado al número de WhatsApp: ${message.toPhoneNumber}`);
        const whatsappAccount = await this.prisma.whatsappAccount.findUnique({
            where: {
                phoneNumber: message.toPhoneNumber,
            },
            include: {
                restaurant: true,
            },
        });
        if (!whatsappAccount ||
            !whatsappAccount.restaurant) {
            this.logger.error(`No existe ningún restaurante configurado para el número de WhatsApp: ${message.toPhoneNumber}`);
            return;
        }
        const restaurant = whatsappAccount.restaurant;
        this.logger.log(`Mensaje asignado con éxito al restaurante: ${restaurant.name} (${restaurant.id})`);
        const existingState = this.conversationStateService.get(message.from);
        if (existingState?.pendingAction ===
            'availability_alternative' &&
            existingState.alternativeSlots.includes(message.text.trim())) {
            await this.whatsappClient.sendMessage(message.from, `✅ Perfecto. Voy a reservar para ${existingState.guests} personas el ${existingState.date} a las ${message.text.trim()}.`);
            existingState.time =
                message.text.trim();
            existingState.pendingAction =
                'none';
            existingState.alternativeSlots =
                [];
            this.conversationStateService.save(existingState);
            const reservationDate = this.buildReservationDate(existingState.date, existingState.time, restaurant.timezone);
            await this.createReservationAndReply(restaurant.id, restaurant.name, message, existingState.guests, reservationDate, restaurant.timezone);
            return;
        }
        if (existingState?.pendingAction ===
            "confirm_cancel") {
            const answer = message.text.trim().toUpperCase();
            if (answer === "NO") {
                existingState.pendingAction = "none";
                existingState.pendingCancellationCode = null;
                this.conversationStateService.save(existingState);
                await this.whatsappClient.sendMessage(message.from, "Cancelación abortada. Tu reserva sigue activa.");
                return;
            }
            if (answer === "SI") {
                const cancellationResult = await this.reservationEngine.cancelReservationByCode(restaurant.id, existingState.pendingCancellationCode, message.from);
                existingState.pendingAction = "none";
                existingState.pendingCancellationCode = null;
                this.conversationStateService.save(existingState);
                await this.whatsappClient.sendMessage(message.from, cancellationResult.message);
                return;
            }
            await this.whatsappClient.sendMessage(message.from, "Por favor responde SI o NO.");
            return;
        }
        const lowercaseText = message.text.toLowerCase();
        if (lowercaseText === "mis reservas") {
            const customer = await this.customerRepository.findByPhone(restaurant.id, message.from);
            if (!customer) {
                await this.whatsappClient.sendMessage(message.from, "No tienes reservas registradas.");
                return;
            }
            const reservations = await this.reservationRepository.findActiveByCustomer(restaurant.id, customer.id);
            if (reservations.length === 0) {
                await this.whatsappClient.sendMessage(message.from, "No tienes reservas activas.");
                return;
            }
            const response = reservations
                .map((r) => `🔑 ${r.confirmationCode}\n📅 ${r.reservationStart.toLocaleDateString("es-ES")}\n⏰ ${r.reservationStart.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}\n👥 ${r.guestCount} personas`)
                .join("\n\n");
            await this.whatsappClient.sendMessage(message.from, `📋 Tus reservas activas:\n\n${response}\n\nPara cancelar una reserva escribe:\nCancelar CODIGO`);
            return;
        }
        if (lowercaseText.startsWith("cancelar")) {
            const parts = message.text.trim().split(/\s+/);
            if (parts.length < 2) {
                await this.whatsappClient.sendMessage(message.from, "Por favor indica el código de reserva. Ejemplo: Cancelar D48DC1");
                return;
            }
            const confirmationCode = parts[1].toUpperCase();
            const stateForCancellation = existingState ??
                this.conversationStateService.create(message.from, restaurant.id);
            stateForCancellation.pendingAction =
                "confirm_cancel";
            stateForCancellation.pendingCancellationCode =
                confirmationCode;
            this.conversationStateService.save(stateForCancellation);
            await this.whatsappClient.sendMessage(message.from, `¿Confirmas cancelar la reserva ${confirmationCode}? Responde SI o NO.`);
            return;
        }
        const conversation = await this.aiService.processConversation(message.from, restaurant.id, message.text);
        const state = conversation.state;
        if (state.pendingAction === "modify_reservation") {
            state.date =
                conversation.extraction.intent.date;
            state.time =
                conversation.extraction.intent.time;
            if (state.date === null ||
                state.time === null) {
                state.pendingAction =
                    "modify_reservation";
                state.pendingModificationCode =
                    state.confirmationCode;
                this.conversationStateService.save(state);
                await this.whatsappClient.sendMessage(message.from, "¿Qué nueva fecha y hora deseas para tu reserva?");
                return;
            }
            const newReservationDate = this.buildReservationDate(state.date, state.time, restaurant.timezone);
            const result = await this.reservationEngine.modifyReservationByCode(restaurant.id, state.pendingModificationCode, message.from, undefined, newReservationDate);
            state.pendingAction = "none";
            state.pendingModificationCode = null;
            this.conversationStateService.save(state);
            await this.whatsappClient.sendMessage(message.from, result.message);
            return;
        }
        if (state.currentIntent === "modify") {
            if (!state.confirmationCode) {
                await this.whatsappClient.sendMessage(message.from, "Indica el código de reserva que deseas modificar. Ejemplo: Modificar D48DC1 para mañana a las 21:00");
                return;
            }
            if (state.date === null ||
                state.time === null) {
                await this.whatsappClient.sendMessage(message.from, "Indica la nueva fecha y hora para la reserva.");
                return;
            }
            const newReservationDate = this.buildReservationDate(state.date, state.time, restaurant.timezone);
            console.log("[MODIFICATION DEBUG]", {
                code: state.confirmationCode,
                date: state.date,
                time: state.time,
                newReservationDate,
            });
            const result = await this.reservationEngine.modifyReservationByCode(restaurant.id, state.confirmationCode, message.from, state.guests ?? undefined, newReservationDate);
            await this.whatsappClient.sendMessage(message.from, result.message);
            return;
        }
        if (state.currentIntent === "check_reservation") {
            if (!state.confirmationCode) {
                await this.whatsappClient.sendMessage(message.from, "Indica el código de reserva. Ejemplo: Consultar D48DC1");
                return;
            }
            const reservationResult = await this.reservationEngine.getReservationByCode(restaurant.id, state.confirmationCode, message.from);
            if (!reservationResult.success) {
                await this.whatsappClient.sendMessage(message.from, reservationResult.message ?? "No se pudo consultar la reserva.");
                return;
            }
            const reservation = reservationResult.reservation;
            await this.whatsappClient.sendMessage(message.from, `📋 Reserva ${reservation.confirmationCode}\n\n` +
                `📅 Fecha: ${reservation.reservationStart.toLocaleDateString("es-ES")}\n` +
                `⏰ Hora: ${reservation.reservationStart.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}\n` +
                `👥 Personas: ${reservation.guestCount}\n` +
                `📌 Estado: ${reservation.status}`);
            return;
        }
        if (state.currentIntent === "cancel") {
            if (!state.confirmationCode) {
                await this.whatsappClient.sendMessage(message.from, "Indica el código de reserva. Ejemplo: Cancelar D48DC1");
                return;
            }
            state.pendingAction =
                "confirm_cancel";
            state.pendingCancellationCode =
                state.confirmationCode;
            this.conversationStateService.save(state);
            await this.whatsappClient.sendMessage(message.from, `¿Confirmas la cancelación de la reserva ${state.confirmationCode}? Responde SI o NO.`);
            return;
        }
        if (state.currentIntent === 'availability') {
            if (state.guests === null ||
                state.date === null ||
                state.time === null) {
                await this.whatsappClient.sendMessage(message.from, this.buildMissingFieldQuestion(state.missingFields));
                return;
            }
            const start = this.buildReservationDate(state.date, state.time, restaurant.timezone);
            const end = new Date(start);
            end.setMinutes(end.getMinutes() + 90);
            const tables = await this.availabilityRepository.findAvailableTables(restaurant.id, start, end, state.guests);
            if (tables.length === 0) {
                const alternatives = await this.availabilityRepository.findAvailableSlots(restaurant.id, start, state.guests);
                state.pendingAction =
                    'availability_alternative';
                state.alternativeSlots =
                    alternatives;
                if (alternatives.length === 0) {
                    await this.whatsappClient.sendMessage(message.from, `❌ No tenemos disponibilidad para ${state.guests} personas el ${state.date} a las ${state.time}.`);
                    return;
                }
                const alternativeText = alternatives
                    .map((slot) => `✅ ${slot}`)
                    .join('\n');
                await this.whatsappClient.sendMessage(message.from, `❌ No tenemos disponibilidad para ${state.guests} personas a las ${state.time}.\n\n` +
                    `Pero tenemos estos horarios disponibles:\n\n` +
                    `${alternativeText}\n\n` +
                    `¿Quieres que te reserve alguno de ellos?`);
                return;
            }
            const suggestedTable = tables[0];
            await this.whatsappClient.sendMessage(message.from, `✅ Tenemos disponibilidad para ${state.guests} personas.\n\n` +
                `🍽 Mesa sugerida: ${suggestedTable.name}\n` +
                `👥 Capacidad: ${suggestedTable.capacity} personas\n` +
                `📅 Fecha: ${state.date}\n` +
                `⏰ Hora: ${state.time}`);
            return;
        }
        if (state.status !== "ready_to_book") {
            const fallback = this.parseReservationText(message.text);
            if (fallback.isValid) {
                await this.createReservationAndReply(restaurant.id, restaurant.name, message, fallback.guestCount, fallback.reservationDate, restaurant.timezone);
                return;
            }
        }
        if (state.status !== 'ready_to_book') {
            const question = this.buildMissingFieldQuestion(state.missingFields);
            await this.whatsappClient.sendMessage(message.from, question);
            return;
        }
        if (state.guests === null ||
            state.date === null ||
            state.time === null) {
            const fallback = this.parseReservationText(message.text);
            if (!fallback.isValid) {
                await this.whatsappClient.sendMessage(message.from, this.buildHelpText());
                return;
            }
            await this.createReservationAndReply(restaurant.id, restaurant.name, message, fallback.guestCount, fallback.reservationDate, restaurant.timezone);
            return;
        }
        const reservationDate = this.buildReservationDate(state.date, state.time, restaurant.timezone);
        await this.createReservationAndReply(restaurant.id, restaurant.name, message, state.guests, reservationDate, restaurant.timezone);
    }
    async createReservationAndReply(restaurantId, restaurantName, message, guestCount, reservationDate, timezone) {
        try {
            const result = await this.reservationEngine.createReservation({
                restaurantId,
                phone: message.from,
                guestCount,
                reservationStart: reservationDate,
                notes: `Reserva automática vía WhatsApp. ID Mensaje: ${message.messageId}`,
                customerName: 'WhatsApp User',
            });
            this.logger.log(`Reserva creada con éxito vía WhatsApp. Código: ${result.confirmationCode} para la mesa: ${result.tableName}`);
            const formattedDate = (0, restaurant_timezone_util_1.formatDateInRestaurantTimezone)(reservationDate, timezone);
            const formattedTime = (0, restaurant_timezone_util_1.formatTimeInRestaurantTimezone)(reservationDate, timezone);
            const replyText = `¡Hola! Tu reserva en *${restaurantName}* ha sido confirmada con éxito. 🎉\n\n` +
                `📍 *Mesa:* ${result.tableName}\n` +
                `👥 *Comensales:* ${guestCount} personas\n` +
                `📅 *Fecha:* ${formattedDate}\n` +
                `⏰ *Hora:* ${formattedTime}\n` +
                `🔑 *Código:* ${result.confirmationCode}\n\n` +
                `¡Te esperamos! Recuerda guardar este mensaje.`;
            await this.whatsappClient.sendMessage(message.from, replyText);
        }
        catch (error) {
            const msg = error instanceof Error
                ? error.message
                : 'Error interno de asignación';
            this.logger.error(`El motor de reservas rechazó la solicitud de WhatsApp: ${msg}`);
            const errorText = `Lo sentimos, no pudimos completar tu solicitud de reserva en este momento. Motivo: ${msg}.\n\n` +
                `Por favor, intenta con otro horario o ponte en contacto directo con el establecimiento.`;
            await this.whatsappClient.sendMessage(message.from, errorText);
        }
    }
    buildMissingFieldQuestion(missingFields) {
        if (missingFields.includes('guests')) {
            return 'Perfecto. ¿Para cuántas personas sería la reserva?';
        }
        if (missingFields.includes('date')) {
            return 'Perfecto. ¿Para qué día quieres hacer la reserva?';
        }
        if (missingFields.includes('time')) {
            return 'Perfecto. ¿A qué hora os gustaría venir?';
        }
        return this.buildHelpText();
    }
    buildHelpText() {
        return (`No pudimos entender todos los detalles de tu solicitud. 😕\n\n` +
            `Por favor, envíanos el *número de personas*, la *fecha* y la *hora* de tu reserva.\n\n` +
            `💡 *Ejemplo:* _"Mesa para 4 personas mañana a las 21:00"_.`);
    }
    buildReservationDate(date, time, timezone) {
        return (0, restaurant_timezone_util_1.buildUtcDateFromRestaurantLocalTime)(date, time, timezone);
    }
    parseReservationText(text) {
        const normalizedText = text.toLowerCase().trim();
        let guestCount = 2;
        const guestRegex = /(?:para|de)?\s*(\d+)\s*(?:personas|comensales|invitados|gentes)?/i;
        const guestMatch = normalizedText.match(guestRegex);
        if (guestMatch &&
            guestMatch[1]) {
            const parsedGuests = parseInt(guestMatch[1], 10);
            if (parsedGuests > 0 &&
                parsedGuests <= 30) {
                guestCount =
                    parsedGuests;
            }
        }
        const now = new Date();
        const targetDate = new Date(now);
        const dateRegex = /(\d{1,2})[\/\-](\d{1,2})/;
        const dateMatch = normalizedText.match(dateRegex);
        if (normalizedText.includes('hoy')) {
        }
        else if (normalizedText.includes('mañana')) {
            targetDate.setDate(targetDate.getDate() +
                1);
        }
        else if (dateMatch &&
            dateMatch[1] &&
            dateMatch[2]) {
            const day = parseInt(dateMatch[1], 10);
            const month = parseInt(dateMatch[2], 10) - 1;
            targetDate.setMonth(month, day);
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            if (targetDate <
                todayStart) {
                targetDate.setFullYear(targetDate.getFullYear() +
                    1);
            }
        }
        else {
            return {
                guestCount,
                reservationDate: now,
                isValid: false,
                errorReason: 'No se pudo identificar una fecha válida.',
            };
        }
        const timeRegex = /(\d{1,2})[:\.](\d{2})/;
        const timeMatch = normalizedText.match(timeRegex);
        let hours = -1;
        let minutes = -1;
        if (timeMatch &&
            timeMatch[1] &&
            timeMatch[2]) {
            hours =
                parseInt(timeMatch[1], 10);
            minutes =
                parseInt(timeMatch[2], 10);
        }
        else {
            const simpleTimeRegex = /(?:a las|a las:)?\s*(\d{1,2})\s*(?:hs|horas|pm|am)?/i;
            const simpleTimeMatch = normalizedText.match(simpleTimeRegex);
            if (simpleTimeMatch &&
                simpleTimeMatch[1]) {
                hours =
                    parseInt(simpleTimeMatch[1], 10);
                minutes = 0;
                if (normalizedText.includes('pm') &&
                    hours < 12) {
                    hours += 12;
                }
            }
        }
        if (hours < 0 ||
            hours > 23 ||
            minutes < 0 ||
            minutes > 59) {
            return {
                guestCount,
                reservationDate: now,
                isValid: false,
                errorReason: 'No se pudo identificar una hora válida.',
            };
        }
        targetDate.setHours(hours, minutes, 0, 0);
        return {
            guestCount,
            reservationDate: targetDate,
            isValid: true,
        };
    }
};
exports.WhatsappService = WhatsappService;
exports.WhatsappService = WhatsappService = WhatsappService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [reservation_engine_service_1.ReservationEngineService,
        config_1.ConfigService,
        prisma_service_1.PrismaService,
        whatsapp_client_service_1.WhatsappClientService,
        ai_service_1.AiService,
        conversation_state_service_1.ConversationStateService,
        availability_repository_1.AvailabilityRepository,
        customer_repository_1.CustomerRepository,
        reservation_repository_1.ReservationRepository,
        phone_validation_service_1.PhoneValidationService,
        groq_service_1.GroqService])
], WhatsappService);
//# sourceMappingURL=whatsapp.service.js.map