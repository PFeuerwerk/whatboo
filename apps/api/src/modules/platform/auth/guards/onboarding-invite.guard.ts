import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import type { Request } from 'express';

@Injectable()
export class OnboardingInviteGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expectedToken = this.configService.get<string>('ONBOARDING_INVITE_TOKEN')?.trim();

    if (!expectedToken) {
      throw new ForbiddenException('El alta de nuevos restaurantes no esta habilitada.');
    }

    const request = context.switchToHttp().getRequest<Request>();
    const providedToken = this.readHeader(request, 'x-onboarding-token');

    if (!providedToken || !this.safeEquals(providedToken, expectedToken)) {
      throw new ForbiddenException('Token de onboarding invalido.');
    }

    return true;
  }

  private readHeader(request: Request, name: string): string | null {
    const raw = request.headers[name];
    const value = Array.isArray(raw) ? raw[0] : raw;
    const normalized = String(value ?? '').trim();
    return normalized || null;
  }

  private safeEquals(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);

    if (leftBuffer.length !== rightBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(leftBuffer, rightBuffer);
  }
}
