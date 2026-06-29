import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { RESERVATION_CANCELLATION_REASON_CODES, ReservationCancellationReasonCode } from './cancel-reservation.dto';

export const RESERVATION_NO_SHOW_REASON_CODES = [
  'CUSTOMER_DID_NOT_ARRIVE',
  'CUSTOMER_UNREACHABLE',
  'ARRIVED_TOO_LATE',
  'DUPLICATE_BOOKING',
  'OTHER',
] as const;

export type ReservationNoShowReasonCode = typeof RESERVATION_NO_SHOW_REASON_CODES[number];

export class NoShowReservationDto {
  @IsOptional()
  @IsIn(RESERVATION_NO_SHOW_REASON_CODES)
  reasonCode?: ReservationNoShowReasonCode;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  details?: string;
}

export type StructuredReservationReasonCode = ReservationCancellationReasonCode | ReservationNoShowReasonCode;
export const STRUCTURED_RESERVATION_REASON_CODES = [
  ...RESERVATION_CANCELLATION_REASON_CODES,
  ...RESERVATION_NO_SHOW_REASON_CODES,
] as const;