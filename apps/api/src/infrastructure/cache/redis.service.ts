import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import IORedis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client?: IORedis;
  private readonly memoryStore = new Map<string, { value: string; expiresAt: number }>();
  private useMemoryStore = false;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    if (this.configService.get<string>('NODE_ENV') === 'test') {
      this.useMemoryStore = true;
      this.logger.log('Cliente Redis del sistema inicializado en memoria para entorno test.');
      return;
    }

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
    this.client?.disconnect();
    this.memoryStore.clear();
  }

  /**
   * Adquiere un bloqueo distribuido atómico (Lock) para un recurso.
   * @param key Identificador único del recurso (ej: lock:restaurant:id)
   * @param ttl Tiempo de vida del bloqueo en milisegundos
   */
  async acquireLock(key: string, ttl: number): Promise<boolean> {
    if (this.useMemoryStore) {
      const existing = this.memoryGet(key);
      if (existing) return false;
      this.memoryStore.set(key, { value: 'locked', expiresAt: Date.now() + ttl });
      return true;
    }

    const result = await this.client!.set(key, 'locked', 'PX', ttl, 'NX');
    return result === 'OK';
  }

  /**
   * Libera de forma explícita el bloqueo distribuido de un recurso.
   */
  async releaseLock(key: string): Promise<void> {
    if (this.useMemoryStore) {
      this.memoryStore.delete(key);
      return;
    }

    await this.client!.del(key);
  }

  async get(key: string): Promise<string | null> {
    if (this.useMemoryStore) {
      return this.memoryGet(key);
    }

    return this.client!.get(key);
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    if (this.useMemoryStore) {
      this.memoryStore.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
      return;
    }

    await this.client!.set(key, value, 'EX', ttlSeconds);
  }

  async ping(): Promise<string> {
    if (this.useMemoryStore) {
      return 'PONG';
    }

    return this.client!.ping();
  }

  private memoryGet(key: string): string | null {
    const record = this.memoryStore.get(key);
    if (!record) return null;

    if (record.expiresAt <= Date.now()) {
      this.memoryStore.delete(key);
      return null;
    }

    return record.value;
  }
}
