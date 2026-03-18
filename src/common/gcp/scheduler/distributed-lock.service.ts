import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class DistributedLockService {
  private readonly logger = new Logger(DistributedLockService.name);

  private get locksRef() {
    return admin.database().ref('cron-locks');
  }

  /**
   * Attempts to acquire a lock for a cron job using RTDB transactions.
   * Only one instance will successfully acquire the lock within the TTL window.
   *
   * @param lockName - Unique identifier for the cron job
   * @param ttlMs - How long the lock should be held (default: 5 minutes)
   * @returns true if this instance acquired the lock, false otherwise
   */
  async acquireLock(lockName: string, ttlMs = 5 * 60 * 1000): Promise<boolean> {
    const lockRef = this.locksRef.child(lockName);
    const now = Date.now();

    try {
      const result = await lockRef.transaction((current) => {
        if (current && current.expiresAt > now) {
          // Lock is still held by another instance — abort
          return undefined;
        }

        // Lock is expired or doesn't exist — claim it
        return {
          acquiredAt: now,
          expiresAt: now + ttlMs,
          instanceId: process.env.K_REVISION || 'local',
        };
      });

      return result.committed;
    } catch (error) {
      this.logger.error(
        `RTDB unreachable - lock "${lockName}" could not be acquired. Job will NOT run. Check RTDB configuration.`,
        error,
      );
      return false;
    }
  }

  /**
   * Releases a lock early (before TTL expiry).
   */
  async releaseLock(lockName: string): Promise<void> {
    try {
      await this.locksRef.child(lockName).remove();
    } catch (error) {
      this.logger.error(`Failed to release lock "${lockName}":`, error);
    }
  }

  /**
   * Wraps a callback in a distributed lock. Only one instance will execute the
   * callback at a time. Safe to call from multiple instances simultaneously.
   *
   * @param lockName - Unique identifier for the cron job
   * @param fn - The work to execute if the lock is acquired
   * @param ttlMs - How long the lock should be held (default: 5 minutes)
   */
  async withLock(lockName: string, fn: () => Promise<void>, ttlMs?: number): Promise<void> {
    const acquired = await this.acquireLock(lockName, ttlMs);
    if (!acquired) {
      this.logger.log(`Lock "${lockName}" held by another instance, skipping`);
      return;
    }

    try {
      await fn();
    } finally {
      await this.releaseLock(lockName);
    }
  }
}
