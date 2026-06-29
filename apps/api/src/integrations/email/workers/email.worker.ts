import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { EmailService } from '../email.service';
import { EMAIL_QUEUE_NAME, EmailQueue } from '../queues/email.queue';
import { PasswordResetEmailJob, StaffInvitationEmailJob, TransactionalEmailJob } from '../email-service.interface';

@Injectable()
export class EmailWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EmailWorker.name);
  private worker?: Worker;
  private redisConnection?: IORedis;

  constructor(
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    private readonly emailQueue: EmailQueue,
  ) {}

  async onModuleInit(): Promise<void> {
    const enabled = this.configService.get<boolean>('EMAIL_WORKER_ENABLED', true);
    const isTest = this.configService.get<string>('NODE_ENV') === 'test';
    if (!enabled || isTest) {
      this.logger.log('Worker asíncrono de email desactivado para este proceso.');
      return;
    }

    const redisHost = this.configService.get<string>('REDIS_HOST', 'localhost');
    const redisPort = this.configService.get<number>('REDIS_PORT', 6379);
    const concurrency = this.configService.get<number>('EMAIL_WORKER_CONCURRENCY', 5);

    this.redisConnection = new IORedis({
      host: redisHost,
      port: redisPort,
      maxRetriesPerRequest: null,
    });

    this.worker = new Worker(
      EMAIL_QUEUE_NAME,
      async (job: Job<TransactionalEmailJob>) => this.process(job),
      {
        connection: this.redisConnection as any,
        concurrency,
        autorun: true,
      },
    );

    this.worker.on('completed', (job) => {
      this.logger.log(`Email job completado. Job ID: ${job.id}`);
    });

    this.worker.on('failed', (job, error) => {
      this.logger.error(`Email job fallido. Job ID: ${job?.id ?? 'unknown'} Error: ${error.message}`);
      const attempts = Number(job?.opts?.attempts ?? 1);
      const attemptsMade = Number(job?.attemptsMade ?? 0);
      if (job && attemptsMade >= attempts) {
        void this.emailQueue.addDeadLetterJob({
          payload: job.data as unknown as Record<string, unknown>,
          sourceJobId: String(job.id ?? ''),
          attemptsMade,
          errorMessage: error.message,
        });
      }
    });

    this.logger.log(`Worker transaccional de email activo en Redis -> ${redisHost}:${redisPort}`);
  }

  private async process(job: Job<TransactionalEmailJob>): Promise<void> {
    if (job.name === 'auth.password-reset') {
      return this.sendPasswordReset(job.data as PasswordResetEmailJob);
    }

    if (job.name === 'staff.invitation') {
      return this.sendStaffInvitation(job.data as StaffInvitationEmailJob);
    }

    throw new Error(`Email job no soportado: ${job.name}`);
  }

  private async sendPasswordReset(data: PasswordResetEmailJob): Promise<void> {
    await this.emailService.sendMail({
      tenantId: data.tenantId,
      restaurantId: data.restaurantId,
      locale: data.locale,
      traceId: data.traceId,
      to: data.to,
      subject: `Restablecer contraseña - ${data.restaurantName}`,
      templateName: data.templateName,
      context: {
        restaurantName: data.restaurantName,
        resetLink: data.resetLink,
      },
    });
  }

  private async sendStaffInvitation(data: StaffInvitationEmailJob): Promise<void> {
    await this.emailService.sendMail({
      tenantId: data.tenantId,
      restaurantId: data.restaurantId,
      locale: data.locale,
      traceId: data.traceId,
      to: data.to,
      subject: `Invitación al equipo - ${data.restaurantName}`,
      templateName: data.templateName,
      context: {
        staffName: data.staffName,
        restaurantName: data.restaurantName,
        activationLink: data.activationLink,
      },
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
    await this.redisConnection?.quit();
  }
}