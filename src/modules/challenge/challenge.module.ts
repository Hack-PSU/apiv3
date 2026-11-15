import { Module } from "@nestjs/common";
import { ObjectionModule } from "common/objection";
import { Challenge } from "entities/challenge.entity";
import { ChallengeController } from "modules/challenge/challenge.controller";

@Module({
  imports: [ObjectionModule.forFeature([Challenge])],
  controllers: [ChallengeController],
})
export class ChallengeModule {}
