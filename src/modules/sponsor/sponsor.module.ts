import { Module } from "@nestjs/common";
import { ObjectionModule } from "common/objection";
import { Sponsor } from "entities/sponsor.entity";
import { SponsorController } from "modules/sponsor/sponsor.controller";
import { SponsorService } from "modules/sponsor/sponsor.service";

@Module({
  imports: [ObjectionModule.forFeature([Sponsor])],
  providers: [SponsorService],
  controllers: [SponsorController],
})
export class SponsorModule {}
