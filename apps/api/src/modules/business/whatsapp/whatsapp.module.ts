import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from "../../../infrastructure/database/prisma.module";

import { WhatsappController } from './controllers/whatsapp.controller';
import { WhatsappService } from './services/whatsapp.service';
import { WhatsappClientService } from './services/whatsapp-client.service';

import { ReservationsModule } from '../reservations/reservations.module';
import { AiModule } from '../../../integrations/ai/ai.module';
import { AvailabilityModule } from '../availability/availability.module';
import { CustomersModule } from '../customers/customers.module';
import { PhoneValidationService } from "../../../common/phone/phone-validation.service";

import { WhatsappQueue } from '../../../queues/whatsapp.queue';
import { WhatsappWorker } from '../../../workers/whatsapp.worker';

@Module({
  imports: [
    PrismaModule,
    ReservationsModule,
    ConfigModule,
    AiModule,
    AvailabilityModule,
    CustomersModule,
  ],

  controllers: [
    WhatsappController,
  ],

  providers: [
    WhatsappService,
    WhatsappClientService,
    WhatsappQueue,
    WhatsappWorker,
    PhoneValidationService,
  ],

  exports: [
    WhatsappClientService,
  ],
})
export class WhatsappModule {}