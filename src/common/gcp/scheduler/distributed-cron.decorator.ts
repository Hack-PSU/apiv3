import { CronExpression, CronOptions } from '@nestjs/schedule';

export const DISTRIBUTED_CRON_LOCK = 'DISTRIBUTED_CRON_LOCK';
export const DISTRIBUTED_CRON_TIME = 'DISTRIBUTED_CRON_TIME';
export const DISTRIBUTED_CRON_OPTIONS = 'DISTRIBUTED_CRON_OPTIONS';

export type DistributedCronOptions = CronOptions & {
  /** TTL for the distributed lock in ms (default: 5 minutes) */
  lockTtlMs?: number;
};

/**
 * Drop-in replacement for @Cron that ensures only one instance
 * runs the job at a time using a Firebase RTDB distributed lock.
 *
 * @param lockName - Unique identifier for the lock
 * @param cronTime - Cron expression or CronExpression enum value
 * @param options - Optional cron and lock configuration
 */
export function DistributedCron(
  lockName: string,
  cronTime: string | CronExpression,
  options?: DistributedCronOptions,
): MethodDecorator {
  return (target, propertyKey) => {
    Reflect.defineMetadata(DISTRIBUTED_CRON_LOCK, lockName, target, propertyKey);
    Reflect.defineMetadata(DISTRIBUTED_CRON_TIME, cronTime, target, propertyKey);
    Reflect.defineMetadata(DISTRIBUTED_CRON_OPTIONS, options || {}, target, propertyKey);
  };
}
