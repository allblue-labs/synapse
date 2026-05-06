import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../../common/redis/redis.module';

/**
 * Per-(IP, email) login throttling.
 *
 * Policy:
 *   - rolling window:    30 min
 *   - attempt threshold: 10 failures within the window
 *   - lockout duration:  15 min
 *
 * Why per-(IP, email) and not per-email alone:
 *   - locking by email lets an attacker DOS a known user with bad guesses
 *   - locking by IP alone means a corporate NAT can't lock anyone out
 *   - the tuple gives us account-takeover resistance without the DOS
 *
 * The throttler decorator on `@Controller('auth')` is the *first* gate —
 * this service is the *second* gate, persistent across processes via Redis,
 * so multi-replica deployments share state.
 */
@Injectable()
export class LoginLockoutService {
  private static readonly WINDOW_SECONDS  = 30 * 60;  // 30 min
  private static readonly LOCK_SECONDS    = 15 * 60;  // 15 min
  private static readonly MAX_ATTEMPTS    = 10;

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  /**
   * Throws 429 with a Retry-After hint if the (ip, email) tuple is locked.
   * Call this *before* doing any password comparison work to keep the
   * server's CPU profile flat regardless of attacker activity.
   */
  async assertNotLocked(email: string, ip: string): Promise<void> {
    const lockKey = this.lockKey(email, ip);
    const ttl = await this.redis.ttl(lockKey);

    if (ttl > 0) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'AUTH_LOCKED',
          message: `Too many failed attempts. Try again in ${Math.ceil(ttl / 60)} minute(s).`,
          retryAfterSeconds: ttl,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  /**
   * Increments the failure counter. Locks the tuple when the threshold
   * is reached. Returns the post-increment count and whether the lock
   * was just engaged — useful for audit logging.
   */
  async recordFailure(
    email: string,
    ip: string,
  ): Promise<{attempts: number; locked: boolean}> {
    const attemptsKey = this.attemptsKey(email, ip);
    const attempts = await this.redis.incr(attemptsKey);

    if (attempts === 1) {
      await this.redis.expire(attemptsKey, LoginLockoutService.WINDOW_SECONDS);
    }

    if (attempts >= LoginLockoutService.MAX_ATTEMPTS) {
      await this.redis.set(this.lockKey(email, ip), '1', 'EX', LoginLockoutService.LOCK_SECONDS);
      return {attempts, locked: true};
    }

    return {attempts, locked: false};
  }

  /** Successful login — clear all counters/locks for this tuple. */
  async recordSuccess(email: string, ip: string): Promise<void> {
    await this.redis.del(this.attemptsKey(email, ip), this.lockKey(email, ip));
  }

  private attemptsKey(email: string, ip: string): string {
    return `auth:fail:${this.normalize(ip)}:${this.normalize(email)}`;
  }

  private lockKey(email: string, ip: string): string {
    return `auth:lock:${this.normalize(ip)}:${this.normalize(email)}`;
  }

  /** Lower-case + trim; strip stray whitespace and colons that would break the key. */
  private normalize(value: string): string {
    return value.toLowerCase().trim().replace(/[^a-z0-9._@-]/g, '_');
  }
}
