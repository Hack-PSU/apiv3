import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DiscoveryService, MetadataScanner } from '@nestjs/core';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { DistributedLockService } from './distributed-lock.service';
import {
  DISTRIBUTED_CRON_LOCK,
  DISTRIBUTED_CRON_TIME,
  DISTRIBUTED_CRON_OPTIONS,
  DistributedCronOptions,
} from './distributed-cron.decorator';

@Injectable()
export class DistributedCronExplorer implements OnModuleInit {
  private readonly logger = new Logger(DistributedCronExplorer.name);

  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly metadataScanner: MetadataScanner,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly lockService: DistributedLockService,
  ) {}

  onModuleInit() {
    const providers = this.discoveryService.getProviders();

    providers
      .filter((wrapper) => wrapper.instance && !wrapper.isAlias)
      .forEach((wrapper) => {
        const { instance } = wrapper;
        const prototype = Object.getPrototypeOf(instance);

        this.metadataScanner.getAllMethodNames(prototype).forEach((methodName) => {
          const lockName = Reflect.getMetadata(
            DISTRIBUTED_CRON_LOCK,
            prototype,
            methodName,
          );
          const cronTime = Reflect.getMetadata(
            DISTRIBUTED_CRON_TIME,
            prototype,
            methodName,
          );
          const options: DistributedCronOptions = Reflect.getMetadata(
            DISTRIBUTED_CRON_OPTIONS,
            prototype,
            methodName,
          ) || {};

          if (!lockName || !cronTime) return;
          if (options.disabled) return;

          const { lockTtlMs, ...cronOptions } = options;
          const boundMethod = instance[methodName].bind(instance);

          const job = CronJob.from({
            cronTime,
            onTick: () => {
              this.lockService.withLock(lockName, () => boundMethod(), lockTtlMs)
                .catch((error) => {
                  this.logger.error(`Cron job "${lockName}" failed:`, error);
                });
            },
            start: false,
            ...cronOptions,
          });

          this.schedulerRegistry.addCronJob(lockName, job);
          job.start();

          this.logger.log(
            `Registered distributed cron "${lockName}" [${cronTime}] → ${prototype.constructor.name}.${methodName}`,
          );
        });
      });
  }
}
