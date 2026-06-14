import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './email.service';

@Module({
  imports: [
    // Inyectamos ConfigModule para asegurar que el EmailService 
    // tenga acceso a las variables de entorno SMTP (SMTP_HOST, SMTP_PORT, etc.)
    ConfigModule,
  ],
  providers: [EmailService],
  exports: [EmailService], // Exportación profesional para permitir su uso en AuthModule
})
export class EmailModule {}
