import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ThrottlerStorage } from '@nestjs/throttler';
import IORedis from 'ioredis';

interface RedisThrottlerStorageRecord {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
}

@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage {
  private readonly client: IORedis;

  constructor(configService: ConfigService) {
    this.client = new IORedis({
      host: configService.get<string>('REDIS_HOST', 'localhost'),
      port: configService.get<number>('REDIS_PORT', 6379),
      maxRetriesPerRequest: null,
    });
  }

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<RedisThrottlerStorageRecord> {
    const bucketKey = `throttle:${throttlerName}:${key}`;
    const blockKey = `${bucketKey}:blocked`;

    const isBlocked = (await this.client.exists(blockKey)) === 1;
    if (isBlocked) {
      return {
        totalHits: limit + 1,
        timeToExpire: await this.ttlSeconds(bucketKey),
        isBlocked: true,
        timeToBlockExpire: await this.ttlSeconds(blockKey),
      };
    }

    const totalHits = await this.client.incr(bucketKey);
    if (totalHits === 1) {
      await this.client.pexpire(bucketKey, ttl);
    }

    if (totalHits > limit) {
      await this.client.set(blockKey, '1', 'PX', blockDuration);
    }

    return {
      totalHits,
      timeToExpire: await this.ttlSeconds(bucketKey),
      isBlocked: totalHits > limit,
      timeToBlockExpire: totalHits > limit ? await this.ttlSeconds(blockKey) : 0,
    };
  }

  private async ttlSeconds(key: string): Promise<number> {
    const ttl = await this.client.pttl(key);
    return ttl > 0 ? Math.ceil(ttl / 1000) : 0;
  }
}
