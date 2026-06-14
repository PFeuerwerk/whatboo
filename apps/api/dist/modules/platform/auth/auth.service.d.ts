import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { EmailService } from '../../../integrations/email/email.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
export declare class AuthService {
    private readonly prisma;
    private readonly jwtService;
    private readonly configService;
    private readonly emailService;
    constructor(prisma: PrismaService, jwtService: JwtService, configService: ConfigService, emailService: EmailService);
    handleResetPassword(dto: ResetPasswordDto): Promise<void>;
    handleForgotPassword(dto: ForgotPasswordDto): Promise<void>;
    login(email: string, password: string, restaurantSlug: string): Promise<{
        accessToken: string;
    }>;
}
