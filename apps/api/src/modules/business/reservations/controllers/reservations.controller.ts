import { PhoneValidationService } from "../../../../common/phone/phone-validation.service";
import { BadRequestException } from "@nestjs/common";
import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../platform/auth/guards/jwt-auth.guard';
import { ReservationEngineService } from '../services/reservation-engine.service';
import { ReservationRepository } from '../repositories/reservation.repository';
import { CreateReservationDto } from '../dto/create-reservation.dto';
import { UpdateReservationStatusDto } from '../dto/update-reservation-status.dto';
import { JwtPayload } from '../../../platform/auth/strategies/jwt.strategy';

interface AuthRequest extends Request {
  user: JwtPayload;
}

@Controller('reservations')
@UseGuards(JwtAuthGuard)
export class ReservationsController {
  constructor(
    private readonly phoneValidationService: PhoneValidationService,
    private readonly : ReservationEngineService,
    private readonly reservationEngine: ReservationEngineService,
    private readonly reservationRepository: ReservationRepository,
  ) {}

  /**
   * Endpoint específico para alimentar la cuadrícula en tiempo real de Angular.
   * Ruta: GET /api/v1/reservations/today
   */
  @Get('today')
  async findToday(@Request() req: AuthRequest) {
    const restaurantId = req.user.restaurantId!;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    
    return this.reservationRepository.findByDateRange(restaurantId, today, endOfDay);
  }

  /**
   * Endpoint genérico para listar reservas filtradas por rangos de fecha opcionales.
   * Ruta: GET /api/v1/reservations
   */
  @Get()
  async findAll(
    @Request() req: AuthRequest,
    @Query('date') date?: string,
  ) {
    const restaurantId = req.user.restaurantId!;

    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      return this.reservationRepository.findByDateRange(restaurantId, start, end);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    return this.reservationRepository.findByDateRange(restaurantId, today, endOfDay);
  }

  /**
   * Obtiene el detalle atómico de una única reserva por su ID.
   * Ruta: GET /api/v1/reservations/:id
   */
  @Get(':id')
  async findOne(@Request() req: AuthRequest, @Param('id') id: string) {
    const restaurantId = req.user.restaurantId!;
    return this.reservationRepository.findById(restaurantId, id);
  }

  /**
   * Crea una nueva reserva de forma manual desde el Dashboard.
   * Ruta: POST /api/v1/reservations
   */
  @Post()
  async create(
    @Request() req: AuthRequest,
    @Body() dto: CreateReservationDto,
  ) {
    const restaurantId = req.user.restaurantId!;
    const phoneValidation = this.phoneValidationService.validate(dto.phone);

    if (!phoneValidation.isValid || !phoneValidation.normalizedPhone) {
      throw new BadRequestException({
        message: "Número de teléfono inválido",
        code: "INVALID_PHONE"
      });
    }

    const phone = phoneValidation.normalizedPhone;

    return this.reservationEngine.createReservation({ restaurantId: restaurantId,
      phone: phone,
      guestCount: dto.guestCount,
      reservationStart: new Date(dto.reservationStart),
      durationMinutes: dto.durationMinutes,
      notes: dto.notes,
      customerName: dto.customerName,
    });

  }

  /**
   * Cambia el estado de negocio de una reserva (Confirmar, Cancelar, No presentado).
   * Ruta: PATCH /api/v1/reservations/:id/status
   */
  @Patch(':id/status')
  async updateStatus(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: UpdateReservationStatusDto,
  ) {
    const restaurantId = req.user.restaurantId!;
    return this.reservationRepository.updateStatus(restaurantId, id, dto.status);
  }

  /**
   * Actualiza parametros basicos de una reserva (Hora/Fecha) con aislamiento Multi-Tenant
   * Ruta: PATCH /api/v1/reservations/:id
   */
  @Patch(":id")
  async update(
    @Request() req: any,
    @Param("id") id: string,
    @Body() dto: { reservationStart?: string }
  ) {
    const restaurantId = req.user.restaurantId!;
    return this.reservationRepository.update(restaurantId, id, {
      reservationStart: dto.reservationStart ? new Date(dto.reservationStart) : undefined
    });
  }
}
