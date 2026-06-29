import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

const WEAK_PASSWORDS = new Set([
  'password',
  'password1',
  'password123',
  'qwerty123',
  'admin123',
  'letmein',
  'welcome1',
  'temporarypass123!',
]);

@Injectable()
export class PasswordPolicyService {
  constructor(private readonly configService: ConfigService) {}

  validateOrThrow(password: string): void {
    const minLength = this.configService.get<number>('PASSWORD_MIN_LENGTH', 12);
    const maxLength = this.configService.get<number>('PASSWORD_MAX_LENGTH', 128);
    const normalized = String(password ?? '');

    if (normalized.length < minLength) {
      throw new BadRequestException(`La contrasena debe tener al menos ${minLength} caracteres.`);
    }
    if (normalized.length > maxLength) {
      throw new BadRequestException(`La contrasena no puede superar ${maxLength} caracteres.`);
    }
    if (this.configService.get<boolean>('PASSWORD_REQUIRE_UPPERCASE', true) && !/[A-Z]/.test(normalized)) {
      throw new BadRequestException('La contrasena debe incluir al menos una letra mayuscula.');
    }
    if (this.configService.get<boolean>('PASSWORD_REQUIRE_LOWERCASE', true) && !/[a-z]/.test(normalized)) {
      throw new BadRequestException('La contrasena debe incluir al menos una letra minuscula.');
    }
    if (this.configService.get<boolean>('PASSWORD_REQUIRE_NUMBER', true) && !/[0-9]/.test(normalized)) {
      throw new BadRequestException('La contrasena debe incluir al menos un numero.');
    }
    if (this.configService.get<boolean>('PASSWORD_REQUIRE_SYMBOL', true) && !/[^A-Za-z0-9]/.test(normalized)) {
      throw new BadRequestException('La contrasena debe incluir al menos un caracter especial.');
    }
    if (WEAK_PASSWORDS.has(normalized.toLowerCase())) {
      throw new BadRequestException('La contrasena es demasiado debil. Usa una contrasena unica y robusta.');
    }
  }

  async assertNotReused(password: string, previousHashes: string[]): Promise<void> {
    const historyLimit = this.configService.get<number>('PASSWORD_HISTORY_LIMIT', 5);
    const hashesToCheck = previousHashes.slice(0, historyLimit);

    for (const hash of hashesToCheck) {
      if (await bcrypt.compare(password, hash)) {
        throw new BadRequestException('No puedes reutilizar una contrasena reciente.');
      }
    }
  }

  temporaryPasswordExpiresAt(): Date {
    const hours = this.configService.get<number>('TEMP_PASSWORD_TTL_HOURS', 24);
    return new Date(Date.now() + hours * 60 * 60 * 1000);
  }
}