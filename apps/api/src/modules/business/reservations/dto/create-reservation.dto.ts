import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateReservationDto {
  @IsString()
  phone!: string;

  @IsInt()
  @Min(1)
  guestCount!: number;

  @IsDateString()
  reservationStart!: string;

  @IsOptional()
  @IsInt()
  @Min(30)
  durationMinutes?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  customerName?: string;
}
