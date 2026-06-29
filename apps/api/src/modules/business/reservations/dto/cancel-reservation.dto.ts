import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ReservationSource } from '@prisma/client';

export class CancelReservationDto {
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;

  @IsOptional()
  @IsEnum(ReservationSource)
  source?: ReservationSource;
}
