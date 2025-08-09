import { Module } from "@nestjs/common";
import { ObjectionModule } from "common/objection";
import { TeamRoster } from "entities/team-roster.entity";
import { User } from "entities/user.entity";
import { TeamController } from "./team.controller";
import { TeamService } from "./team.service";

@Module({
  imports: [
    ObjectionModule.forFeature([
      {
        schema: TeamRoster,
        disableByHackathon: true,
      },
      {
        schema: User,
        disableByHackathon: true,
      },
    ]),
  ],
  controllers: [TeamController],
  providers: [TeamService],
  exports: [TeamService],
})
export class TeamModule {}
