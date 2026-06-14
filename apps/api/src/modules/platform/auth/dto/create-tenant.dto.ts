import { IsEmail, IsNotEmpty, IsString, IsInt, Min, Max, Matches } from 'class-validator';

export class CreateTenantDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9-]+$/, { message: 'El slug debe ser alfanumérico y separado por guiones (ej: la-piazza)' })
  slug!: string;

  @IsInt()
  @Min(10)
  @Max(1000)
  maxCapacity!: number;

  @IsEmail({}, { message: 'El formato del correo electrónico es inválido' })
  @IsNotEmpty()
  ownerEmail!: string;

  @IsString()
  @IsNotEmpty()
  ownerFirstName!: string;

  @IsString()
  @IsNotEmpty()
  ownerLastName!: string;
}
