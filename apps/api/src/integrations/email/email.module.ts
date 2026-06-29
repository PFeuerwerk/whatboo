import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './email.service';
import { EmailQueue } from './queues/email.queue';
import { EmailWorker } from './workers/email.worker';

@Module({
  imports: [ConfigModule],
  providers: [EmailService, EmailQueue, EmailWorker],
  exports: [EmailService, EmailQueue],
})
export class EmailModule {}
