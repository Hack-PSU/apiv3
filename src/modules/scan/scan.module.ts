import { Module } from "@nestjs/common";
import { ObjectionModule } from "common/objection";
import { Scan } from "entities/scan.entity";
import { ScanController } from "modules/scan/scan.controller";

@Module({
  imports: [ObjectionModule.forFeature([Scan])],
  controllers: [ScanController],
})
export class ScanModule {}
