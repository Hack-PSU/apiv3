import { Global, Module } from "@nestjs/common";
import { DiscoveryModule } from "@nestjs/core";
import { DistributedLockService } from "./distributed-lock.service";
import { DistributedCronExplorer } from "./distributed-cron.explorer";

@Global()
@Module({
  imports: [DiscoveryModule],
  providers: [DistributedLockService, DistributedCronExplorer],
  exports: [DistributedLockService],
})
export class DistributedLockModule {}
