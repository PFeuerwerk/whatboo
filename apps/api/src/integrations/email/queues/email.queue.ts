import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { PasswordResetEmailJob, StaffInvitationEmailJob } from '../email-service.interface';

export const EMAIL_QUEUE_NAME = 'email-transactional-queue';
export const EMAIL_DLQ_NAME = 'email-transactional-dlq';

@Injectable()
export class EmailQueue implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EmailQueue.name);
  private queue?: Queue;
  private dlq?: Queue;
  private redisConnection?: IORedis;
  private isTestMode = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    this.isTestMode = this.configService.get<string>('NODE_ENV') === 'test';
    if (this.isTestMode) {
      this.logger.log('Cola de email inicializada en modo test sin Redis.');
      return;
    }

    const redisHost = this.configService.get<string>('REDIS_HOST', 'localhost');
    const redisPort = this.configService.get<number>('REDIS_PORT', 6379);
    const attempts = this.configService.get<number>('EMAIL_QUEUE_ATTEMPTS', 5);
    const backoffMs = this.configService.get<number>('EMAIL_QUEUE_BACKOFF_MS', 5000);

    this.redisConnection = new IORedis({
      host: redisHost,
      port: redisPort,
      maxRetriesPerRequest: null,
    });

    this.queue = new Queue(EMAIL_QUEUE_NAME, {
      connection: this.redisConnection as any,
      defaultJobOptions: {
        attempts,
        backoff: {
          type: 'exponential',
          delay: backoffMs,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });

    this.dlq = new Queue(EMAIL_DLQ_NAME, {
      connection: this.redisConnection as any,
      defaultJobOptions: {
        removeOnComplete: false,
        removeOnFail: false,
      },
    });

    this.logger.log(`Cola transaccional de email inicializada en Redis -> ${redisHost}:${redisPort}`);
  }

  async addPasswordResetJob(payload: PasswordResetEmailJob): Promise<void> {
    await this.addTransactionalJob('auth.password-reset', payload, 2);
  }

  async addStaffInvitationJob(payload: StaffInvitationEmailJob): Promise<void> {
    await this.addTransactionalJob('staff.invitation', payload, 1);
  }

  async addDeadLetterJob(input: {
    payload: Record<string, unknown>;
    sourceJobId?: string;
    attemptsMade?: number;
    errorMessage: string;
    failedAt?: string;
  }): Promise<void> {
    if (!this.dlq) {
      return;
    }

    await this.dlq.add(
      'failed-email',
      {
        ...input,
        failedAt: input.failedAt ?? new Date().toISOString(),
      },
      {
        jobId: input.sourceJobId ? `dlq:${input.sourceJobId}` : undefined,
      },
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue?.close();
    await this.dlq?.close();
    await this.redisConnection?.quit();
  }

  private async addTransactionalJob(name: string, payload: PasswordResetEmailJob | StaffInvitationEmailJob, priority: number): Promise<void> {
    if (this.isTestMode || !this.queue) {
      this.logger.debug(`Email ${name} omitido en test. Trace: ${payload.traceId}`);
      return;
    }

    await this.queue.add(name, payload, {
      jobId: payload.traceId,
      priority,
    });
  }
}