import { PhoneValidationService } from '../../../../common/phone/phone-validation.service';
import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ReservationStatus } from '@prisma/client';
import { JwtAuthGuard } from '../../../platform/auth/guards/jwt-auth.guard';
import { DashboardGateway } from '../../../../infrastructure/observability/events/dashboard.gateway';
import { ReservationEngineService } from '../services/reservation-engine.service';
import { ReservationRepository } from '../repositories/reservation.repository';
import { CreateReservationDto } from '../dto/create-reservation.dto';
import { UpdateReservationStatusDto } from '../dto/update-reservation-status.dto';

interface UpdateReservationDto {
  reservationStart?: string;
  reservationEnd?: string;
  guestCount?: number;
  notes?: string | null;
  tableId?: string | null;
}

@Controller('reservations')
@UseGuards(JwtAuthGuard)
export class ReservationsController {
  constructor(
    private readonly phoneValidationService: PhoneValidationService,
    private readonly reservationEngine: ReservationEngineService,
    private readonly reservationRepository: ReservationRepository,
    private readonly dashboardGateway: DashboardGateway,
  ) {}

  @Get('today')
  async findToday(@Req() req: any) {
    const restaurantId = req['tenantId'];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);
    return this.reservationRepository.findByDateRange(restaurantId, today, endOfDay);
  }

  @Get()
  async findAll(@Req() req: any, @Query('date') date?: string) {
    const restaurantId = req['tenantId'];

    if (date) {
      const start = new Date(date);
      if (Number.isNaN(start.getTime())) {
        throw new BadRequestException('Formato de fecha inválido. Usa YYYY-MM-DD.');
      }
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setHours(23, 59, 59, 999);
      return this.reservationRepository.findByDateRange(restaurantId, start, end);
    }

    return this.findToday(req);
  }

  @Get(':id')
  async findOne(@Req() req: any, @Param('id') id: string) {
    const restaurantId = req['tenantId'];
    return this.reservationRepository.findById(restaurantId, id);
  }

  @Post()
  async create(@Req() req: any, @Body() dto: CreateReservationDto) {
    const restaurantId = req['tenantId'];
    const phoneValidation = this.phoneValidationService.validate(dto.phone);

    if (!phoneValidation.isValid || !phoneValidation.normalizedPhone) {
      throw new BadRequestException({ message: 'Número de teléfono inválido', code: 'INVALID_PHONE' });
    }

    return this.reservationEngine.createReservation({
      restaurantId,
      phone: phoneValidation.normalizedPhone,
      guestCount: dto.guestCount,
      reservationStart: new Date(dto.reservationStart),
      durationMinutes: dto.durationMinutes,
      notes: dto.notes,
      customerName: dto.customerName,
    });
  }

  @Patch(':id/status')
  async updateStatus(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateReservationStatusDto) {
    const restaurantId = req['tenantId'];
    const updated = await this.reservationRepository.updateStatus(restaurantId, id, dto.status);

    if (updated) {
      this.dashboardGateway.emitToRestaurant(restaurantId, 'reservation_updated', updated);
    }

    return updated;
  }

  @Patch(':id/cancel')
  async cancel(@Req() req: any, @Param('id') id: string, @Body() dto?: { reason?: string }) {
    const restaurantId = req['tenantId'];
    const current = await this.reservationRepository.findById(restaurantId, id);

    if (!current) {
      throw new BadRequestException('La reserva no existe o no pertenece al restaurante actual.');
    }

    const updated = await this.reservationRepository.updateStatus(
      restaurantId,
      id,
      ReservationStatus.CANCELLED,
    );

    if (updated && dto?.reason?.trim()) {
      const withReason = await this.reservationRepository.update(restaurantId, id, {
        notes: [updated.notes, `Cancelación dashboard: ${dto.reason.trim()}`]
          .filter(Boolean)
          .join('\n'),
      });

      this.dashboardGateway.emitToRestaurant(restaurantId, 'reservation_updated', withReason);
      return withReason;
    }

    if (updated) {
      this.dashboardGateway.emitToRestaurant(restaurantId, 'reservation_updated', updated);
    }

    return updated;
  }

  @Patch(':id')
  async update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateReservationDto) {
    const restaurantId = req['tenantId'];
    const current = await this.reservationRepository.findById(restaurantId, id);

    if (!current) return null;

    const reservationStart = dto.reservationStart ? new Date(dto.reservationStart) : undefined;
    if (dto.reservationStart && Number.isNaN(reservationStart?.getTime())) {
      throw new BadRequestException('reservationStart inválido. Usa ISO-8601.');
    }

    const reservationEnd = dto.reservationEnd
      ? new Date(dto.reservationEnd)
      : reservationStart
        ? this.computeReservationEnd(reservationStart, current.reservationEnd, current.reservationStart)
        : undefined;

    if (dto.reservationEnd && Number.isNaN(reservationEnd?.getTime())) {
      throw new BadRequestException('reservationEnd inválido. Usa ISO-8601.');
    }

    const updated = await this.reservationRepository.update(restaurantId, id, {
      reservationStart,
      reservationEnd,
      guestCount: dto.guestCount,
      notes: dto.notes,
      tableId: dto.tableId !== undefined ? dto.tableId : undefined,
    });

    if (updated) {
      this.dashboardGateway.emitToRestaurant(restaurantId, 'reservation_updated', updated);
    }

    return updated;
  }

  private computeReservationEnd(nextStart: Date, currentEnd: Date, currentStart: Date): Date {
    const currentDurationMs = currentEnd.getTime() - currentStart.getTime();
    const safeDurationMs = currentDurationMs > 0 ? currentDurationMs : 90 * 60 * 1000;
    return new Date(nextStart.getTime() + safeDurationMs);
  }
}
