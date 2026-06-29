import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('WorkerBootstrap');
  process.env.WHATSAPP_WORKER_ENABLED = process.env.WHATSAPP_WORKER_ENABLED ?? 'true';

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  });

  const shutdown = async (signal: NodeJS.Signals) => {
    logger.log(`Recibida señal ${signal}. Cerrando worker...`);
    await app.close();
    process.exit(0);
  };

  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);

  logger.log('Worker NestJS iniciado en modo application context.');
}

void bootstrap();
