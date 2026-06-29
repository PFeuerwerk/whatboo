import { Module } from '@nestjs/common';
import { SecurityModule } from '../../../common/security/security.module';
import { EmailModule } from '../../../integrations/email/email.module';
import { UsersController } from './controllers/users.controller';
import { UsersService } from './services/users.service';

@Module({
  imports: [SecurityModule, EmailModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}