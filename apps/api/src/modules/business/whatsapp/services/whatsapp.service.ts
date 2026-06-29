import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ReservationEngineService } from '../../reservations/services/reservation-engine.service';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { WhatsappClientService } from './whatsapp-client.service';
import { DeterministicReservationIntentService } from '../../../../integrations/ai/application/services/deterministic-reservation-intent.service';
import { AvailabilityService } from '../../availability/services/availability.service';
import { CustomerRepository } from "../../customers/repositories/customer.repository";
import { ReservationRepository } from "../../reservations/repositories/reservation.repository";
import { ConversationStateService } from '../../../../integrations/ai/application/services/conversation-state.service';
import { IntentType } from '../../../../integrations/ai/application/normalizers/intent.normalizer';
import * as crypto from 'crypto';
import {
  buildUtcDateFromRestaurantLocalTime,
  formatDateInRestaurantTimezone,
  formatTimeInRestaurantTimezone,
} from "../../../../common/time/restaurant-timezone.util";
import { normalizePhone } from "../../../../common/phone/phone-normalizer.util";
import { PhoneValidationService } from "../../../../common/phone/phone-validation.service";
import { GroqService } from "../../../../integrations/ai/infrastructure/providers/groq.service";
import axios from "axios";


interface WhatsappMessage {
  from: string;
  toPhoneNumber: string;
  text: string;
  messageId: string;
}

interface ExtractedReservationData {
  guestCount: number;
  reservationDate: Date;
  isValid: boolean;
  errorReason?: string;
}

@Injectable()
export class WhatsappService {
  private normalizePhone(phone: string | undefined | null, context: string): string | null {
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

  private safePhone(phone: string | undefined | null): string | null {
    if (!phone) return null;
    const v = this.phoneValidationService.validate(phone);
    if (!v.isValid || !v.normalizedPhone) return null;
    return String(v.normalizedPhone);
  }

  private readonly logger = new Logger(WhatsappService.name);

  constructor(
    private readonly reservationEngine: ReservationEngineService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly whatsappClient: WhatsappClientService,
    private readonly deterministicIntentService: DeterministicReservationIntentService,
    private readonly conversationStateService: ConversationStateService,
    private readonly availabilityService: AvailabilityService,
    private readonly customerRepository: CustomerRepository,
    private readonly reservationRepository: ReservationRepository,
      private readonly phoneValidationService: PhoneValidationService,
      private readonly groqService: GroqService,
  ) {}

  async handleIncoming(
    body: Record<string, unknown>,
    signature: string,
    rethrowOnFailure = false,
  ): Promise<void> {
    try {
      const message = this.extractMessage(body);

      if (!message) {
        this.logger.debug(
          'No se encontró ningún mensaje de texto válido en el payload del webhook.',
        );
        return;
      }

        this.logger.log(
          `Mensaje entrante de WhatsApp desde ${message.from} hacia ${message.toPhoneNumber}: ${message.text}`,
        );

        if ((message as any).audioId) {
          this.logger.log(`[Whisper STT] Detectada nota de voz. Descargando recurso Media ID: ${(message as any).audioId}`);
          const token = this.configService.get<string>("WHATSAPP_ACCESS_TOKEN");
          const mediaUrlResponse = await axios.get(`https://facebook.com{(message as any).audioId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const downloadUrl = mediaUrlResponse.data?.url;
          if (downloadUrl) {
            const audioDownload = await axios.get(downloadUrl, {
              headers: { Authorization: `Bearer ${token}` },
              responseType: "arraybuffer"
            });
            const audioBuffer = Buffer.from(audioDownload.data);
            const transcribedText = await this.groqService.transcribeAudioBuffer(audioBuffer, "voice.ogg");
            this.logger.log(`[Whisper STT Result] Audio transcrito con éxito: "${transcribedText}"`);
            message.text = transcribedText;
          } else {
            throw new Error("No se pudo obtener la URL de descarga de audio desde Meta Cloud API.");
          }
        }


      await this.processMessage(message);
    } catch (error) {
      const errMsg =
        error instanceof Error
          ? error.message
          : 'Error desconocido';

      this.logger.error(
        `Fallo crítico al procesar el mensaje entrante de WhatsApp: ${errMsg}`,
        error,
      );

      if (rethrowOnFailure) {
        throw error;
      }
    }
  }

  public validateSignature(
    body: Record<string, unknown>,
    signature: string,
  ): void {
    const appSecret =
      this.configService.get<string>(
        'WHATSAPP_APP_SECRET',
      );

    if (!appSecret) {
      this.logger.warn(
        'Falta configurar WHATSAPP_APP_SECRET en el entorno. Saltando validación criptográfica.',
      );
      return;
    }

    try {
      const expectedSignature =
        signature.startsWith('sha256=')
          ? signature.substring(7)
          : signature;

      const rawBody = JSON.stringify(body);

      const actualSignature = crypto
        .createHmac('sha256', appSecret)
        .update(rawBody)
        .digest('hex');

      const isSignatureValid =
        crypto.timingSafeEqual(
          Buffer.from(
            actualSignature,
            'utf-8',
          ),
          Buffer.from(
            expectedSignature,
            'utf-8',
          ),
        );

      if (!isSignatureValid) {
        throw new UnauthorizedException(
          'La firma x-hub-signature-256 no coincide con el payload enviado.',
        );
      }
    } catch {
      this.logger.error(
        'Error durante la validación de la firma criptográfica de WhatsApp.',
      );

      throw new UnauthorizedException(
        'Fallo de validación de firma en la infraestructura de WhatsApp.',
      );
    }
  }

  private extractMessage(body: any) {
    try {
      const value = body?.entry?.[0]?.changes?.[0]?.value;
      const metadata = value?.metadata;
      const toPhoneNumber = metadata?.display_phone_number;
      const messages = value?.messages;
      const msg = messages?.[0];

        const isAudio = msg?.type === "audio";
        if (!msg || !toPhoneNumber || (msg.type !== "text" && !isAudio)) return null;

      const fromPhone = this.safePhone(msg.from as string);
      const toPhone = this.safePhone(toPhoneNumber);

      if (!fromPhone || !toPhone) return null;

        return {
          from: fromPhone,
          toPhoneNumber: toPhone,
          text: isAudio ? null : (msg.text as any)?.body ?? null,
          audioId: isAudio ? (msg.audio as any)?.id ?? null : null,
          messageId: msg.id as string,
        };
      } catch {
        return null;
      }
    }


  private async processMessage(
    message: WhatsappMessage,
  ): Promise<void> {
    this.logger.log(
      `Buscando restaurante vinculado al número de WhatsApp: ${message.toPhoneNumber}`,
    );

    const whatsappAccount =
      await this.prisma.whatsappAccount.findUnique({
        where: {
          phoneNumber:
            message.toPhoneNumber,
        },
        include: {
          restaurant: true,
        },
      });

    if (
      !whatsappAccount ||
      !whatsappAccount.restaurant
    ) {
      this.logger.error(
        `No existe ningún restaurante configurado para el número de WhatsApp: ${message.toPhoneNumber}`,
      );
      return;
    }

    const restaurant =
      whatsappAccount.restaurant;

    this.logger.log(
      `Mensaje asignado con éxito al restaurante: ${restaurant.name} (${restaurant.id})`,
    );


      const existingState =
        this.conversationStateService.get(
          message.from,
        );



      if (
        existingState?.pendingAction ===
          'availability_alternative' &&
        existingState.alternativeSlots.includes(
          message.text.trim(),
        )
      ) {
        await this.whatsappClient.sendMessage(
          message.from,
          `✅ Perfecto. Voy a reservar para ${existingState.guests} personas el ${existingState.date} a las ${message.text.trim()}.`,
        );

        existingState.time =
          message.text.trim();

        existingState.pendingAction =
          'none';

        existingState.alternativeSlots =
          [];

        this.conversationStateService.save(
          existingState,
        );

          const reservationDate =
            this.buildReservationDate(
              existingState.date!,
              existingState.time!,
            restaurant.timezone,
              );

          await this.createReservationAndReply(
            restaurant.id,
            restaurant.name,
            message,
            existingState.guests!,
            reservationDate,
          restaurant.timezone,
            );

          return;
      }


      if (
        existingState?.pendingAction ===
        "confirm_cancel"
      ) {
        const answer =
          message.text.trim().toUpperCase();

        if (answer === "NO") {
          existingState.pendingAction = "none";
          existingState.pendingCancellationCode = null;

          this.conversationStateService.save(
            existingState,
          );

          await this.whatsappClient.sendMessage(
            message.from,
            "Cancelación abortada. Tu reserva sigue activa.",
          );

          return;
        }

        if (answer === "SI") {
          const cancellationResult =
            await this.reservationEngine.cancelReservationByCode(
              restaurant.id,
              existingState.pendingCancellationCode!,
                message.from,
            );

          existingState.pendingAction = "none";
          existingState.pendingCancellationCode = null;

          this.conversationStateService.save(
            existingState,
          );

          await this.whatsappClient.sendMessage(
            message.from,
            cancellationResult.message,
          );

          return;
        }

        await this.whatsappClient.sendMessage(
          message.from,
          "Por favor responde SI o NO.",
        );

        return;
      }



    const lowercaseText =
      message.text.toLowerCase();

        if (
          lowercaseText === "mis reservas"
        ) {
          const customer =
            await this.customerRepository.findByPhone(
              restaurant.id,
              message.from,
            );

          if (!customer) {
            await this.whatsappClient.sendMessage(
              message.from,
              "No tienes reservas registradas.",
            );

            return;
          }

          const reservations =
            await this.reservationRepository.findActiveByCustomer(
              restaurant.id,
              customer.id,
            );

          if (reservations.length === 0) {
            await this.whatsappClient.sendMessage(
              message.from,
              "No tienes reservas activas.",
            );

            return;
          }

          const response = reservations
            .map((r: any) =>
              `🔑 ${r.confirmationCode}\n📅 ${r.reservationStart.toLocaleDateString("es-ES")}\n⏰ ${r.reservationStart.toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"})}\n👥 ${r.guestCount} personas`
            )
            .join("\n\n");

          await this.whatsappClient.sendMessage(
            message.from,
            `📋 Tus reservas activas:\n\n${response}\n\nPara cancelar una reserva escribe:\nCancelar CODIGO`,
          );

          return;
        }


      if (
        lowercaseText.startsWith("cancelar")
      ) {
        const parts =
          message.text.trim().split(/\s+/);

        if (parts.length < 2) {
          await this.whatsappClient.sendMessage(
            message.from,
            "Por favor indica el código de reserva. Ejemplo: Cancelar D48DC1",
          );

          return;
        }

        const confirmationCode =
          parts[1].toUpperCase();

          const stateForCancellation =
            existingState ??
            this.conversationStateService.create(
              message.from,
              restaurant.id,
            );

          stateForCancellation.pendingAction =
            "confirm_cancel";

          stateForCancellation.pendingCancellationCode =
            confirmationCode;

          this.conversationStateService.save(
            stateForCancellation,
          );


        await this.whatsappClient.sendMessage(
          message.from,
          `¿Confirmas cancelar la reserva ${confirmationCode}? Responde SI o NO.`,
        );

        return;
      }


    const conversation =
      this.deterministicIntentService.processConversation(
        message.from,
        restaurant.id,
        message.text,
      );

    const state = conversation.state;

    if (
      state.pendingAction === "modify_reservation"
    ) {
      state.date =
        conversation.extraction.intent.date;

      state.time =
        conversation.extraction.intent.time;

        if (
          state.date === null ||
          state.time === null
        ) {
          state.pendingAction =
            "modify_reservation";

          state.pendingModificationCode =
            state.confirmationCode;

          this.conversationStateService.save(
            state,
          );

          await this.whatsappClient.sendMessage(
            message.from,
            "¿Qué nueva fecha y hora deseas para tu reserva?",
          );

          return;
        }

      const newReservationDate =
        this.buildReservationDate(
          state.date,
          state.time,
        restaurant.timezone,
          );

      const result =
        await this.reservationEngine.modifyReservationByCode(
          restaurant.id,
          state.pendingModificationCode!,
          message.from,
          undefined,
          newReservationDate,
        );

      state.pendingAction = "none";
      state.pendingModificationCode = null;

      this.conversationStateService.save(
        state,
      );

      await this.whatsappClient.sendMessage(
        message.from,
        result.message,
      );

      return;
    }


    if (
      state.currentIntent === "modify"
    ) {
      if (
        !state.confirmationCode
      ) {
        await this.whatsappClient.sendMessage(
          message.from,
          "Indica el código de reserva que deseas modificar. Ejemplo: Modificar D48DC1 para mañana a las 21:00",
        );

        return;
      }

      if (
        state.date === null ||
        state.time === null
      ) {
        await this.whatsappClient.sendMessage(
          message.from,
          "Indica la nueva fecha y hora para la reserva.",
        );

        return;
      }

      const newReservationDate =
        this.buildReservationDate(
          state.date,
          state.time,
        restaurant.timezone,
          );

        console.log("[MODIFICATION DEBUG]", {
          code: state.confirmationCode,
          date: state.date,
          time: state.time,
          newReservationDate,
        });

      const result =
        await this.reservationEngine.modifyReservationByCode(
          restaurant.id,
          state.confirmationCode,
          message.from,
          state.guests ?? undefined,
          newReservationDate,
        );

      await this.whatsappClient.sendMessage(
        message.from,
        result.message,
      );

      return;
    }


      if (
        state.currentIntent === "check_reservation"
      ) {
        if (
          !state.confirmationCode
        ) {
          await this.whatsappClient.sendMessage(
            message.from,
            "Indica el código de reserva. Ejemplo: Consultar D48DC1",
          );

          return;
        }

        const reservationResult =
          await this.reservationEngine.getReservationByCode(
            restaurant.id,
            state.confirmationCode,
            message.from,
          );

        if (!reservationResult.success) {
          await this.whatsappClient.sendMessage(
            message.from,
            reservationResult.message ?? "No se pudo consultar la reserva.",
          );

          return;
        }

        const reservation =
          reservationResult.reservation!;

        await this.whatsappClient.sendMessage(
          message.from,
          `📋 Reserva ${reservation.confirmationCode}\n\n` +
          `📅 Fecha: ${reservation.reservationStart.toLocaleDateString("es-ES")}\n` +
          `⏰ Hora: ${reservation.reservationStart.toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"})}\n` +
          `👥 Personas: ${reservation.guestCount}\n` +
          `📌 Estado: ${reservation.status}`,
        );

        return;
      }


      if (
        state.currentIntent === "cancel"
      ) {
        if (
          !state.confirmationCode
        ) {
          await this.whatsappClient.sendMessage(
            message.from,
            "Indica el código de reserva. Ejemplo: Cancelar D48DC1",
          );

          return;
        }

        state.pendingAction =
          "confirm_cancel";

        state.pendingCancellationCode =
          state.confirmationCode;

        this.conversationStateService.save(
          state,
        );

        await this.whatsappClient.sendMessage(
          message.from,
          `¿Confirmas la cancelación de la reserva ${state.confirmationCode}? Responde SI o NO.`,
        );

        return;
      }

    if (
      state.currentIntent === 'availability'
    ) {
      if (
        state.guests === null ||
        state.date === null ||
        state.time === null
      ) {
        await this.whatsappClient.sendMessage(
          message.from,
          this.buildMissingFieldQuestion(

            state.missingFields,
          ),
        );

        return;
      }

      const start =
        this.buildReservationDate(
          state.date,
          state.time,
        restaurant.timezone,
          );

      const end =
        new Date(start);

      end.setMinutes(
        end.getMinutes() + 90,
      );

      const tables =
        await this.availabilityService.findBestAvailableTables(
          restaurant.id,
          start,
          end,
          state.guests,
        );

      if (
        tables.length === 0
      ) {
        const alternatives =
          await this.availabilityService.findAvailableSlots(
            restaurant.id,
            start,
            state.guests,
          );

          state.pendingAction =
            'availability_alternative';

          state.alternativeSlots =
            alternatives;


        if (
          alternatives.length === 0
        ) {
          await this.whatsappClient.sendMessage(
            message.from,
            `❌ No tenemos disponibilidad para ${state.guests} personas el ${state.date} a las ${state.time}.`,
          );

          return;
        }

        const alternativeText =
          alternatives
            .map(
              (slot) => `✅ ${slot}`,
            )
            .join('\n');

        await this.whatsappClient.sendMessage(
          message.from,
          `❌ No tenemos disponibilidad para ${state.guests} personas a las ${state.time}.\n\n` +
          `Pero tenemos estos horarios disponibles:\n\n` +
          `${alternativeText}\n\n` +
          `¿Quieres que te reserve alguno de ellos?`,
        );

        return;
      }


      const suggestedTable =
        tables[0];

      await this.whatsappClient.sendMessage(
        message.from,
        `✅ Tenemos disponibilidad para ${state.guests} personas.\n\n` +
        `🍽 Mesa sugerida: ${suggestedTable.name}\n` +
        `👥 Capacidad: ${suggestedTable.capacity} personas\n` +
        `📅 Fecha: ${state.date}\n` +
        `⏰ Hora: ${state.time}`,
      );

      return;
    }


    if (
      state.status !== "ready_to_book"
    ) {
      const fallback =
        this.parseReservationText(
          message.text,
        );

      if (fallback.isValid) {
        await this.createReservationAndReply(
          restaurant.id,
          restaurant.name,
          message,
          fallback.guestCount,
          fallback.reservationDate,
          restaurant.timezone,
        );

        return;
      }
    }

    if (
      state.status !== 'ready_to_book'
    ) {
      const question =
        this.buildMissingFieldQuestion(
          state.missingFields,
        );

      await this.whatsappClient.sendMessage(
        message.from,
        question,
      );

      return;
    }

    if (
      state.guests === null ||
      state.date === null ||
      state.time === null
    ) {
      const fallback =
        this.parseReservationText(
          message.text,
        );

      if (!fallback.isValid) {
        await this.whatsappClient.sendMessage(
          message.from,
          this.buildHelpText(),
        );
        return;
      }

      await this.createReservationAndReply(
        restaurant.id,
        restaurant.name,
        message,
        fallback.guestCount,
        fallback.reservationDate,
      restaurant.timezone,
        );

      return;
    }

    const reservationDate =
      this.buildReservationDate(
        state.date,
        state.time,
      restaurant.timezone,
          );

    await this.createReservationAndReply(
      restaurant.id,
      restaurant.name,
      message,
      state.guests,
      reservationDate,
    restaurant.timezone,
      );
  }

  private async createReservationAndReply(
    restaurantId: string,
    restaurantName: string,
    message: WhatsappMessage,
    guestCount: number,
    reservationDate: Date,
  timezone: string,
    ): Promise<void> {
    try {
      const result =
        await this.reservationEngine.createReservation(
          {
            restaurantId,
            phone: message.from,
            guestCount,
            reservationStart:
              reservationDate,
            notes:
              `Reserva automática vía WhatsApp. ID Mensaje: ${message.messageId}`,
            customerName:
              'WhatsApp User',
          },
        );

      this.logger.log(
        `Reserva creada con éxito vía WhatsApp. Código: ${result.confirmationCode} para la mesa: ${result.tableName}`,
      );

      const formattedDate =
          formatDateInRestaurantTimezone(
            reservationDate,
            timezone,
          );

        const formattedTime =
          formatTimeInRestaurantTimezone(
            reservationDate,
            timezone,
          );

      const replyText =
        `¡Hola! Tu reserva en *${restaurantName}* ha sido confirmada con éxito. 🎉\n\n` +
        `📍 *Mesa:* ${result.tableName}\n` +
        `👥 *Comensales:* ${guestCount} personas\n` +
        `📅 *Fecha:* ${formattedDate}\n` +
        `⏰ *Hora:* ${formattedTime}\n` +
        `🔑 *Código:* ${result.confirmationCode}\n\n` +
        `¡Te esperamos! Recuerda guardar este mensaje.`;

      await this.whatsappClient.sendMessage(
        message.from,
        replyText,
      );
    } catch (error) {
      const msg =
        error instanceof Error
          ? error.message
          : 'Error interno de asignación';

      this.logger.error(
        `El motor de reservas rechazó la solicitud de WhatsApp: ${msg}`,
      );

      const errorText =
        `Lo sentimos, no pudimos completar tu solicitud de reserva en este momento. Motivo: ${msg}.\n\n` +
        `Por favor, intenta con otro horario o ponte en contacto directo con el establecimiento.`;

      await this.whatsappClient.sendMessage(
        message.from,
        errorText,
      );
    }
  }

  private buildMissingFieldQuestion(
    missingFields: string[],
  ): string {
    if (
      missingFields.includes(
        'guests',
      )
    ) {
      return 'Perfecto. ¿Para cuántas personas sería la reserva?';
    }

    if (
      missingFields.includes(
        'date',
      )
    ) {
      return 'Perfecto. ¿Para qué día quieres hacer la reserva?';
    }

    if (
      missingFields.includes(
        'time',
      )
    ) {
      return 'Perfecto. ¿A qué hora os gustaría venir?';
    }

    return this.buildHelpText();
  }

  private buildHelpText(): string {
    return (
      `No pudimos entender todos los detalles de tu solicitud. 😕\n\n` +
      `Por favor, envíanos el *número de personas*, la *fecha* y la *hora* de tu reserva.\n\n` +
      `💡 *Ejemplo:* _"Mesa para 4 personas mañana a las 21:00"_.`
    );
  }

  private buildReservationDate(
    date: string,
    time: string,
    timezone: string,
  ): Date {
    return buildUtcDateFromRestaurantLocalTime(
      date,
      time,
      timezone,
    );
  }



  private parseReservationText(
    text: string,
  ): ExtractedReservationData {
    const normalizedText =
      text.toLowerCase().trim();

    let guestCount = 2;

    const guestRegex =
      /(?:para|de)?\s*(\d+)\s*(?:personas|comensales|invitados|gentes)?/i;

    const guestMatch =
      normalizedText.match(
        guestRegex,
      );

    if (
      guestMatch &&
      guestMatch[1]
    ) {
      const parsedGuests =
        parseInt(
          guestMatch[1],
          10,
        );

      if (
        parsedGuests > 0 &&
        parsedGuests <= 30
      ) {
        guestCount =
          parsedGuests;
      }
    }

    const now = new Date();
    const targetDate =
      new Date(now);

    const dateRegex =
      /(\d{1,2})[\/\-](\d{1,2})/;

    const dateMatch =
      normalizedText.match(
        dateRegex,
      );

    if (
      normalizedText.includes(
        'hoy',
      )
    ) {
      // Mantiene fecha actual.
    } else if (
      normalizedText.includes(
        'mañana',
      )
    ) {
      targetDate.setDate(
        targetDate.getDate() +
          1,
      );
    } else if (
      dateMatch &&
      dateMatch[1] &&
      dateMatch[2]
    ) {
      const day =
        parseInt(
          dateMatch[1],
          10,
        );

      const month =
        parseInt(
          dateMatch[2],
          10,
        ) - 1;

      targetDate.setMonth(
        month,
        day,
      );

      const todayStart =
        new Date();

      todayStart.setHours(
        0,
        0,
        0,
        0,
      );

      if (
        targetDate <
        todayStart
      ) {
        targetDate.setFullYear(
          targetDate.getFullYear() +
            1,
        );
      }
    } else {
      return {
        guestCount,
        reservationDate: now,
        isValid: false,
        errorReason:
          'No se pudo identificar una fecha válida.',
      };
    }

    const timeRegex =
      /(\d{1,2})[:\.](\d{2})/;

    const timeMatch =
      normalizedText.match(
        timeRegex,
      );

    let hours = -1;
    let minutes = -1;

    if (
      timeMatch &&
      timeMatch[1] &&
      timeMatch[2]
    ) {
      hours =
        parseInt(
          timeMatch[1],
          10,
        );

      minutes =
        parseInt(
          timeMatch[2],
          10,
        );
    } else {
      const simpleTimeRegex =
        /(?:a las|a las:)?\s*(\d{1,2})\s*(?:hs|horas|pm|am)?/i;

      const simpleTimeMatch =
        normalizedText.match(
          simpleTimeRegex,
        );

      if (
        simpleTimeMatch &&
        simpleTimeMatch[1]
      ) {
        hours =
          parseInt(
            simpleTimeMatch[1],
            10,
          );

        minutes = 0;

        if (
          normalizedText.includes(
            'pm',
          ) &&
          hours < 12
        ) {
          hours += 12;
        }
      }
    }

    if (
      hours < 0 ||
      hours > 23 ||
      minutes < 0 ||
      minutes > 59
    ) {
      return {
        guestCount,
        reservationDate: now,
        isValid: false,
        errorReason:
          'No se pudo identificar una hora válida.',
      };
    }

    targetDate.setHours(
      hours,
      minutes,
      0,
      0,
    );

    return {
      guestCount,
      reservationDate:
        targetDate,
      isValid: true,
    };
  }
}
