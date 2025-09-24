import { Module } from "@nestjs/common";
import { ObjectionModule } from "common/objection";
import { Reservation } from "entities/reservation.entity";
import { Location } from "entities/location.entity";
import { Hackathon } from "entities/hackathon.entity";
import { Team } from "entities/team.entity";
import { Organizer } from "entities/organizer.entity";
import { ReservationController } from "./reservation.controller";
import { ReservationService } from "./reservation.service";

@Module({
  imports: [
    ObjectionModule.forFeature([
      {
        schema: Reservation,
        disableByHackathon: true,
      },
      {
        schema: Location,
        disableByHackathon: true,
      },
      {
        schema: Hackathon,
        disableByHackathon: true,
      },
      {
        schema: Team,
        disableByHackathon: false,
      },
      {
        schema: Organizer,
        disableByHackathon: true,
      },
    ]),
  ],
  controllers: [ReservationController],
  providers: [ReservationService],
  exports: [ReservationService],
})
export class ReservationModule {}
