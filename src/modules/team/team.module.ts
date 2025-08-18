import { Module } from "@nestjs/common";
import { ObjectionModule } from "common/objection";
import { Team } from "entities/team.entity";
import { User } from "entities/user.entity";
import { TeamController } from "./team.controller";

@Module({
  imports: [ObjectionModule.forFeature([Team, User])],
  controllers: [TeamController],
})
export class TeamModule {}
