import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class ForgotPasswordDto {
  @IsNotEmpty({ message: 'El identificador del restaurante (Slug) es obligatorio.' })
  @IsString({ message: 'El Slug debe ser una cadena de texto válida.' })
  readonly restaurantSlug!: string; // Corregido: Operador '!' para asignación dinámica diferida

  @IsNotEmpty({ message: 'El correo electrónico es obligatorio.' })
  @IsEmail({}, { message: 'Por favor, introduce un formato de correo electrónico válido.' })
  readonly email!: string; // Corregido: Operador '!' para asignación dinámica diferida
}
