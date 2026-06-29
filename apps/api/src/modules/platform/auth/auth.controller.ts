import { Controller, Post, Body, HttpCode, HttpStatus, NotFoundException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { CreateTenantDto } from './dto/create-tenant.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Endpoint para el inicio de sesión de personal del restaurante
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password, dto.restaurantSlug);
  }

  /**
   * Endpoint público para solicitar la recuperación de contraseña
   * Ruta: POST /api/v1/auth/forgot-password
   */
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<{ message: string }> {
    try {
      await this.authService.handleForgotPassword(dto);
    } catch (error) {
      // Práctica profesional de seguridad B2B: Si el restaurante o el correo no existen,
      // no le damos pistas al atacante. Respondemos con éxito de todas formas.
      if (!(error instanceof NotFoundException)) {
        throw error; // Si es otro tipo de error (ej: base de datos caída), dejamos que fluya
      }
    }

    return {
      message: 'Si el correo electrónico coincide con un restaurante registrado, se enviará un enlace de restauración.',
    };
  }

  /**
   * Endpoint público para consumir el token y cambiar la contraseña de forma real
   * Ruta: POST /api/v1/auth/reset-password
   */
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<{ message: string }> {
    await this.authService.handleResetPassword(dto);
    
    return {
      message: 'Tu contraseña ha sido restaurada con éxito. Ya puedes iniciar sesión en tu panel.',
    };
  }
  /**
   * Aprovisionamiento perimetral administrativo de nuevos restaurantes
   * Ruta: POST /api/v1/auth/register-tenant
   */
  @Post("register-tenant")
  async registerTenant(@Body() dto: CreateTenantDto) {
    return this.authService.provisionTenant(dto);
  }
}
