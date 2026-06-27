import {
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class ParseReservationDto {
  @IsString()
  @IsNotEmpty()
  message!: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  restaurantId?: string;
}