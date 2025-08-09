import { Module } from "@nestjs/common";
import { ObjectionModule } from "common/objection";
import { Location } from "entities/location.entity";
import { LocationController } from "./location.controller";

@Module({
  imports: [
    ObjectionModule.forFeature([
      {
        schema: Location,
        disableByHackathon: true,
      },
    ]),
  ],
  controllers: [LocationController],
})
export class LocationModule {}
