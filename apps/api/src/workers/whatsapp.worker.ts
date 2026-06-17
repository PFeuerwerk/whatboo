import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Worker, Job } from 'bullmq';
import { WhatsappService } from '../modules/business/whatsapp/services/whatsapp.service';
import { WHATSAPP_QUEUE_NAME } from '../queues/whatsapp.queue';
import { DashboardGateway } from "../infrastructure/observability/events/dashboard.gateway";
import IORedis from 'ioredis';

@Injectable()
export class WhatsappWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WhatsappWorker.name);
  private worker!: Worker;
  private redisConnection!: IORedis;

  constructor(
    private readonly configService: ConfigService,
    private readonly whatsappService: WhatsappService,
      private readonly dashboardGateway: DashboardGateway,
  ) {}

  async onModuleInit() {
    const redisHost = this.configService.get<string>('REDIS_HOST', 'localhost');
    const redisPort = this.configService.get<number>('REDIS_PORT', 6379);

    this.redisConnection = new IORedis({
      host: redisHost,
      port: redisPort,
      maxRetriesPerRequest: null,
    });

    this.worker = new Worker(
      WHATSAPP_QUEUE_NAME,
      async (job: Job<Record<string, unknown>>) => {
        this.logger.debug(`[WORKER] Procesando Job ID: ${job.id} de la cola de WhatsApp...`);
        await this.whatsappService.handleIncoming(job.data, '');
      },
      {
        // Corregido: Casting a 'any' para unificar la firma de conexión esperada por la interfaz de BullMQ
        connection: this.redisConnection as any,
          concurrency: 5,
        autorun: true,
      }
    );

      this.worker.on("completed", (job) => {
        this.logger.log(`[WORKER SUCCESS] Job ID ${job.id} procesado con éxito. Reserva y respuesta despachadas.`);
      });

      this.worker.on("failed", (job, error) => {
        this.logger.error(`[WORKER CRITICAL] Job ID ${job?.id} ha fallado de forma definitiva: ${error?.message || "Error desconocido"}`);
        
        const payload = job?.data;
        const metadata = (payload as any)?.entry?.[0]?.changes?.[0]?.value?.metadata;
        const displayPhone = metadata?.display_phone_number || "GLOBAL";

        this.dashboardGateway.emitToRestaurant(displayPhone, "whatsapp_queue_error", {
          jobId: job?.id,
          errorMessage: error?.message || "Error desconocido",
          timestamp: new Date().toISOString(),
        });
      });

        this.logger.log(`Worker asíncrono de WhatsApp activado y escuchando Redis de fondo.`);
  }
  async onModuleDestroy() {
    if (this.worker) {
      await this.worker.close();
    }
    if (this.redisConnection) {
      await this.redisConnection.quit();
    }
    this.logger.log('Worker de WhatsApp apagado correctamente de la memoria.');
  }
}
