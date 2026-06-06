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
    private readonly reservationEngine: ReservationEngineService,
    private readonly reservationRepository: ReservationRepository,
  ) {}

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

  @Get(':id')
  async findOne(@Request() req: AuthRequest, @Param('id') id: string) {
    const restaurantId = req.user.restaurantId!;
    return this.reservationRepository.findById(restaurantId, id);
  }

  @Post()
  async create(
    @Request() req: AuthRequest,
    @Body() dto: CreateReservationDto,
  ) {
    const restaurantId = req.user.restaurantId!;
    return this.reservationEngine.createReservation({
      restaurantId,
      phone: dto.phone,
      guestCount: dto.guestCount,
      reservationStart: new Date(dto.reservationStart),
      durationMinutes: dto.durationMinutes,
      notes: dto.notes,
      customerName: dto.customerName,
    });
  }

  @Patch(':id/status')
  async updateStatus(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: UpdateReservationStatusDto,
  ) {
    const restaurantId = req.user.restaurantId!;
    return this.reservationRepository.updateStatus(restaurantId, id, dto.status);
  }
}
