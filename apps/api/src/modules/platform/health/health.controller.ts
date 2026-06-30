import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { HealthCheck, HealthCheckService, PrismaHealthIndicator } from '@nestjs/terminus';
import { EmailService } from '../../../integrations/email/email.service';
import { EmailQueue } from '../../../integrations/email/queues/email.queue';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { WhatsappQueue } from '../../../queues/whatsapp.queue';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaHealth: PrismaHealthIndicator,
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly emailQueue: EmailQueue,
    private readonly whatsappQueue: WhatsappQueue,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.prismaHealth.pingCheck('database', this.prisma),
    ]);
  }

  @Get('live')
  live() {
    return {
      status: 'ok',
      checks: {
        api: {
          status: 'up',
          checkedAt: new Date().toISOString(),
        },
      },
    };
  }

  @Get('ready')
  async ready() {
    const [database, emailQueue, whatsappQueue] = await Promise.all([
      this.checkDatabase(),
      this.emailQueue.checkHealth(),
      this.whatsappQueue.checkHealth(),
    ]);

    const status =
      database.status === 'up' &&
      emailQueue.status === 'up' &&
      whatsappQueue.status === 'up'
        ? 'ok'
        : 'error';

    const payload = {
      status,
      checks: {
        database,
        emailQueue,
        whatsappQueue,
      },
    };

    if (status !== 'ok') {
      throw new ServiceUnavailableException(payload);
    }

    return payload;
  }

  @Get('email')
  async email() {
    const [smtp, queue] = await Promise.all([
      this.emailService.checkHealth(),
      this.emailQueue.checkHealth(),
    ]);

    const status = smtp.status === 'up' && queue.status === 'up' ? 'ok' : 'error';
    const payload = {
      status,
      checks: {
        smtp,
        queue,
      },
    };

    if (status !== 'ok') {
      throw new ServiceUnavailableException(payload);
    }

    return payload;
  }

  @Get('queues')
  async queues() {
    const [email, whatsapp] = await Promise.all([
      this.emailQueue.checkHealth(),
      this.whatsappQueue.checkHealth(),
    ]);

    const status = email.status === 'up' && whatsapp.status === 'up' ? 'ok' : 'error';
    const payload = {
      status,
      checks: {
        email,
        whatsapp,
      },
    };

    if (status !== 'ok') {
      throw new ServiceUnavailableException(payload);
    }

    return payload;
  }

  private async checkDatabase(): Promise<{ status: 'up' | 'down'; error?: string }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'up' };
    } catch (error) {
      return {
        status: 'down',
        error: error instanceof Error ? error.message : 'Error desconocido en base de datos.',
      };
    }
  }
}
