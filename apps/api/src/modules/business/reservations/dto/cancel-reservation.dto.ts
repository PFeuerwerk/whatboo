import { IsEnum, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ReservationSource } from '@prisma/client';

export const RESERVATION_CANCELLATION_REASON_CODES = [
  'CUSTOMER_REQUEST',
  'RESTAURANT_CLOSED',
  'DUPLICATE_BOOKING',
  'PAYMENT_OR_DEPOSIT_ISSUE',
  'OPERATIONAL_CAPACITY',
  'OTHER',
] as const;

export type ReservationCancellationReasonCode = typeof RESERVATION_CANCELLATION_REASON_CODES[number];

export class CancelReservationDto {
  @IsOptional()
  @IsIn(RESERVATION_CANCELLATION_REASON_CODES)
  reasonCode?: ReservationCancellationReasonCode;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  details?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason?: string;

  @IsOptional()
  @IsEnum(ReservationSource)
  source?: ReservationSource;
}