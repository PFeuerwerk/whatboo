import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';

const SENSITIVE_KEYS = ['password', 'passwordHash', 'token', 'secret', 'accessToken', 'refreshToken', 'authorization', 'smtp_pass'];

export interface AuditLogInput {
  tenantId?: string | null;
  tenantSlug?: string | null;
  actorUserId?: string | null;
  actorRole?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  previousValue?: unknown;
  newValue?: unknown;
  metadata?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
  result?: 'SUCCESS' | 'FAILURE' | string;
  durationMs?: number | null;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async record(input: AuditLogInput): Promise<void> {
    if (this.configService.get<string>('NODE_ENV') === 'test') {
      return;
    }

    try {
      await this.prisma.auditLog.create({
        data: {
          tenantId: input.tenantId ?? undefined,
          tenantSlug: input.tenantSlug ?? undefined,
          actorUserId: input.actorUserId ?? undefined,
          actorRole: input.actorRole ?? undefined,
          action: input.action,
          entity: input.entity,
          entityId: input.entityId ?? undefined,
          previousValue: this.toJson(input.previousValue),
          newValue: this.toJson(input.newValue),
          metadata: this.toJson(input.metadata),
          ipAddress: input.ipAddress ?? undefined,
          userAgent: input.userAgent ?? undefined,
          result: input.result ?? 'SUCCESS',
          durationMs: input.durationMs ?? undefined,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown audit error';
      this.logger.error(`No se pudo registrar auditoria: ${message}`);
    }
  }

  private toJson(value: unknown): Prisma.InputJsonValue | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }
    return this.sanitize(value) as Prisma.InputJsonValue;
  }

  private sanitize(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.sanitize(item));
    }

    if (value && typeof value === 'object') {
      const sanitized: Record<string, unknown> = {};
      for (const [key, entry] of Object.entries(value)) {
        const normalizedKey = key.toLowerCase();
        sanitized[key] = SENSITIVE_KEYS.some((sensitive) => normalizedKey.includes(sensitive.toLowerCase()))
          ? '[REDACTED]'
          : this.sanitize(entry);
      }
      return sanitized;
    }

    return value;
  }
}