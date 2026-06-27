import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsNotEmpty({ message: 'El token de recuperación es obligatorio.' })
  @IsString({ message: 'El token debe ser una cadena de texto válida.' })
  readonly token!: string; // Corregido: Operador '!' para asignación dinámica diferida

  @IsNotEmpty({ message: 'La nueva contraseña es obligatoria.' })
  @IsString({ message: 'La contraseña debe ser una cadena de texto válida.' })
  @MinLength(8, { message: 'La nueva contraseña debe contener un mínimo de 8 caracteres.' })
  readonly newPassword!: string; // Corregido: Operador '!' para asignación dinámica diferida
}
