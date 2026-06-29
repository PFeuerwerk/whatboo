import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { getActiveJwtSecret, getJwtSecrets } from '../../../../common/security/jwt-secrets.util';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  restaurantId: string | null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKeyProvider: (_request: unknown, rawJwtToken: string, done: (error: Error | null, secret?: string) => void) => {
        try {
          const kid = JwtStrategy.extractKid(rawJwtToken);
          const secrets = getJwtSecrets(configService);
          const selected = kid ? secrets.find((entry) => entry.kid === kid) : undefined;
          done(null, (selected ?? getActiveJwtSecret(configService)).secret);
        } catch (error) {
          done(error instanceof Error ? error : new Error('JWT secret resolution failed'));
        }
      },
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, isActive: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      restaurantId: payload.restaurantId,
    };
  }

  private static extractKid(token: string): string | undefined {
    const [encodedHeader] = token.split('.');
    if (!encodedHeader) {
      return undefined;
    }
    const normalized = encodedHeader.replace(/-/g, '+').replace(/_/g, '/');
    const header = JSON.parse(Buffer.from(normalized, 'base64').toString('utf8')) as { kid?: string };
    return header.kid;
  }
}