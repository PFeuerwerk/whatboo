import { PhoneValidationService } from '../../../../common/phone/phone-validation.service';
import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ReservationStatus } from '@prisma/client';
import { JwtAuthGuard } from '../../../platform/auth/guards/jwt-auth.guard';
import { DashboardGateway } from '../../../../infrastructure/observability/events/dashboard.gateway';
import { ReservationEngineService } from '../services/reservation-engine.service';
import { ReservationRepository } from '../repositories/reservation.repository';
import { CreateReservationDto } from '../dto/create-reservation.dto';
import { UpdateReservationStatusDto } from '../dto/update-reservation-status.dto';
import { ListReservationsQueryDto } from '../dto/list-reservations-query.dto';
import { UpdateReservationDto } from '../dto/update-reservation.dto';
import { CancelReservationDto } from '../dto/cancel-reservation.dto';

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
  async findAll(@Req() req: any, @Query() query: ListReservationsQueryDto) {
    const restaurantId = req['tenantId'];
    const date = query.date;

    if (this.shouldUseAdvancedList(query)) {
      const range: { start?: Date; end?: Date } =
        query.from || query.to || query.date ? this.resolveDateRange(query) : {};
      return this.reservationRepository.list(restaurantId, {
        from: range.start,
        to: range.end,
        status: query.status,
        source: query.source,
        q: query.q,
        take: query.take,
        skip: query.skip,
      });
    }

    if (date) {
      const { start, end } = this.resolveDateRange(query);
      return this.reservationRepository.list(restaurantId, {
        from: start,
        to: end,
        take: query.take,
        skip: query.skip,
      });
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
    if (dto.status === ReservationStatus.CANCELLED) {
      throw new BadRequestException('Usa el endpoint dedicado de cancelacion para registrar un motivo estructurado.');
    }

    const updated = await this.reservationRepository.updateStatus(restaurantId, id, dto.status);

    if (updated) {
      this.dashboardGateway.emitToRestaurant(restaurantId, 'reservation_updated', updated);
    }

    return updated;
  }

  @Patch(':id/cancel')
  async cancel(@Req() req: any, @Param('id') id: string, @Body() dto: CancelReservationDto) {
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

    if (updated) {
      await this.reservationRepository.createCancellationAudit({
        restaurantId,
        reservationId: id,
        cancelledByUserId: req.user?.sub ?? req.user?.id ?? null,
        reason: dto.reason.trim(),
        source: dto.source,
      });
    }

    if (updated && dto.reason.trim()) {
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

  @Get(':id/cancellation-audits')
  async cancellationAudits(@Req() req: any, @Param('id') id: string) {
    const restaurantId = req['tenantId'];
    const current = await this.reservationRepository.findById(restaurantId, id);

    if (!current) {
      throw new BadRequestException('La reserva no existe o no pertenece al restaurante actual.');
    }

    return this.reservationRepository.listCancellationAudits(restaurantId, id);
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

  private shouldUseAdvancedList(query: ListReservationsQueryDto): boolean {
    return Boolean(
      query.from ||
      query.to ||
      query.status ||
      query.source ||
      query.q ||
      query.take !== undefined ||
      query.skip !== undefined,
    );
  }

  private resolveDateRange(query: ListReservationsQueryDto): { start: Date; end: Date } {
    const start = new Date(query.from ?? query.date ?? new Date());
    if (Number.isNaN(start.getTime())) {
      throw new BadRequestException('Formato de fecha inválido. Usa ISO-8601 o YYYY-MM-DD.');
    }

    if (!query.from && !query.to) {
      start.setHours(0, 0, 0, 0);
      const endOfDay = new Date(start);
      endOfDay.setHours(23, 59, 59, 999);
      return { start, end: endOfDay };
    }

    const end = query.to ? new Date(query.to) : new Date(start);
    if (Number.isNaN(end.getTime())) {
      throw new BadRequestException('Formato de fecha final inválido. Usa ISO-8601 o YYYY-MM-DD.');
    }

    if (!query.to) {
      end.setHours(23, 59, 59, 999);
    }

    return { start, end };
  }
}
