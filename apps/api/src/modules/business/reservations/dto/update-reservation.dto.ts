import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateReservationDto {
  @IsOptional()
  @IsDateString()
  reservationStart?: string;

  @IsOptional()
  @IsDateString()
  reservationEnd?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  guestCount?: number;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsOptional()
  @IsString()
  tableId?: string | null;
}
