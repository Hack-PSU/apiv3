import { Module } from "@nestjs/common";
import { ObjectionModule } from "common/objection";
import { Sponsor } from "entities/sponsor.entity";
import { SponsorController } from "modules/sponsor/sponsor.controller";

@Module({
  imports: [ObjectionModule.forFeature([Sponsor])],
  controllers: [SponsorController],
})
export class SponsorModule {}
