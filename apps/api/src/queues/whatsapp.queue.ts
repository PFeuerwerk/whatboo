import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

export const WHATSAPP_QUEUE_NAME = 'whatsapp-inbound-queue';

@Injectable()
export class WhatsappQueue implements OnModuleInit {
  private readonly logger = new Logger(WhatsappQueue.name);
  private queue!: Queue;
  private redisConnection!: IORedis;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const redisHost = this.configService.get<string>('REDIS_HOST', 'localhost');
    const redisPort = this.configService.get<number>('REDIS_PORT', 6379);

    this.redisConnection = new IORedis({
      host: redisHost,
      port: redisPort,
      maxRetriesPerRequest: null,
    });

    this.queue = new Queue(WHATSAPP_QUEUE_NAME, {
      // Corregido: Casting a 'any' para unificar la firma de conexión esperada por la interfaz de BullMQ
      connection: this.redisConnection as any,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });

    this.logger.log(`Cola asíncrona de WhatsApp inicializada correctamente en Redis -> ${redisHost}:${redisPort}`);
  }

  async addJob(payload: Record<string, unknown>): Promise<void> {
    const jobId = (payload['entry'] as any)?.[0]?.changes?.[0]?.value?.messages?.[0]?.id;
    
    await this.queue.add('process-webhook', payload, {
      jobId,
    });
    
    this.logger.debug(`Mensaje encolado de forma segura en Redis. Job ID: ${jobId}`);
  }
}
