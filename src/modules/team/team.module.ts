import { Module } from "@nestjs/common";
import { ObjectionModule } from "common/objection";
import { Team } from "entities/team.entity";
import { User } from "entities/user.entity";
import { TeamController } from "./team.controller";
import { Hackathon } from "entities/hackathon.entity";
import { Reservation } from "entities/reservation.entity";

@Module({
  imports: [ObjectionModule.forFeature([Team, User, Hackathon, Reservation])],
  controllers: [TeamController],
})
export class TeamModule {}
