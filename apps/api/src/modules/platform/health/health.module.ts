import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { EmailModule } from '../../../integrations/email/email.module';
import { WhatsappModule } from '../../business/whatsapp/whatsapp.module';
import { HealthController } from './health.controller';

@Module({
  imports: [TerminusModule, EmailModule, WhatsappModule],
  controllers: [HealthController],
})
export class HealthModule {}
