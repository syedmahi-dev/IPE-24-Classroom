import { Redis } from 'ioredis'

const globalForRedis = globalThis as unknown as { redis: Redis }

const isRedisUrlValid = !!process.env.REDIS_URL;

class MemoryFallback {
  private store = new Map<string, { value: string, expiresAt: number }>();
  async get(key: string) {
    const item = this.store.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }
  async setex(key: string, seconds: number, value: string) {
    this.store.set(key, { value, expiresAt: Date.now() + seconds * 1000 });
    return 'OK';
  }
  async del(key: string) {
    this.store.delete(key);
    return 1;
  }
  pipeline() {
    return {
      zremrangebyscore: () => this,
      zadd: () => this,
      zcard: () => this,
      expire: () => this,
      exec: async () => [[null, 0], [null, 1], [null, 1], [null, 1]]
    } as any;
  }
}

export const redis =
  globalForRedis.redis ||
  (isRedisUrlValid
    ? new Redis(process.env.REDIS_URL!, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => Math.min(times * 100, 2000),
        lazyConnect: true,
      })
    : new MemoryFallback() as unknown as Redis)

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis as any
