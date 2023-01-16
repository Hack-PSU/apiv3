import { Module } from "@nestjs/common";
import { ObjectionModule } from "common/objection";
import { Hackathon } from "entities/hackathon.entity";
import { HackathonController } from "./hackathon.controller";

@Module({
  imports: [ObjectionModule.forFeature([Hackathon])],
  controllers: [HackathonController],
})
export class HackathonModule {}
