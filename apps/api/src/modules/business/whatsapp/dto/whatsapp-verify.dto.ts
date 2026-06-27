import { IsNotEmpty, IsString } from 'class-validator';

export class WhatsappVerifyDto {
  @IsNotEmpty()
  @IsString()
  readonly 'hub.mode'!: string; // Corregido: Inicialización diferida estricta

  @IsNotEmpty()
  @IsString()
  readonly 'hub.verify_token'!: string; // Corregido: Inicialización diferida estricta

  @IsNotEmpty()
  @IsString()
  readonly 'hub.challenge'!: string; // Corregido: Inicialización diferida estricta
}
