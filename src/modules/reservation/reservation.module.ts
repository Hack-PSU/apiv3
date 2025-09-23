import { Module } from "@nestjs/common";
import { ObjectionModule } from "common/objection";
import { Reservation } from "entities/reservation.entity";
// import { ReservationAudit } from "entities/reservation-audit.entity";
import { Location } from "entities/location.entity";
import { Hackathon } from "entities/hackathon.entity";
// import { TeamRoster } from "entities/team-roster.entity";
import { ReservationController } from "./reservation.controller";
import { ReservationService } from "./reservation.service";

@Module({
  imports: [
    ObjectionModule.forFeature([
      {
        schema: Reservation,
        disableByHackathon: true,
      },
      // {
      //   schema: ReservationAudit,
      //   disableByHackathon: true,
      // },
      {
        schema: Location,
        disableByHackathon: true,
      },
      {
        schema: Hackathon,
        disableByHackathon: true,
      },
      // {
      //   schema: TeamRoster,
      //   disableByHackathon: true,
      // },
    ]),
  ],
  controllers: [ReservationController],
  providers: [ReservationService],
  exports: [ReservationService],
})
export class ReservationModule {}