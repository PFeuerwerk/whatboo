import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import IORedis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client!: IORedis;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const host = this.configService.get<string>('REDIS_HOST', 'localhost');
    const port = this.configService.get<number>('REDIS_PORT', 6379);

    this.client = new IORedis({
      host,
      port,
      maxRetriesPerRequest: null,
    });

    this.logger.log(`Cliente Redis del sistema inicializado correctamente -> ${host}:${port}`);
  }

  onModuleDestroy() {
    this.client.disconnect();
  }

  /**
   * Adquiere un bloqueo distribuido atómico (Lock) para un recurso.
   * @param key Identificador único del recurso (ej: lock:restaurant:id)
   * @param ttl Tiempo de vida del bloqueo en milisegundos
   */
  async acquireLock(key: string, ttl: number): Promise<boolean> {
    const result = await this.client.set(key, 'locked', 'PX', ttl, 'NX');
    return result === 'OK';
  }

  /**
   * Libera de forma explícita el bloqueo distribuido de un recurso.
   */
  async releaseLock(key: string): Promise<void> {
    await this.client.del(key);
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.client.set(key, value, 'EX', ttlSeconds);
  }

  async ping(): Promise<string> {
    return this.client.ping();
  }
}
