import { Module } from "@nestjs/common";
import { ObjectionModule } from "common/objection";
import { TeamRoster } from "entities/team-roster.entity";
import { User } from "entities/user.entity";
import { Hackathon } from "entities/hackathon.entity";
import { TeamsController } from "./teams.controller";
import { TeamsService } from "./teams.service";

@Module({
  imports: [ObjectionModule.forFeature([TeamRoster, User, Hackathon])],
  providers: [TeamsService],
  controllers: [TeamsController],
  exports: [TeamsService],
})
export class TeamsModule {}
