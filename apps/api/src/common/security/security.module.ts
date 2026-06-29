import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { AuditLogService } from './audit-log.service';
import { PasswordPolicyService } from './password-policy.service';

@Module({
  imports: [PrismaModule],
  providers: [AuditLogService, PasswordPolicyService],
  exports: [AuditLogService, PasswordPolicyService],
})
export class SecurityModule {}