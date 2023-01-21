import { Module } from "@nestjs/common";
import { ObjectionModule } from "common/objection";
import { Organizer } from "entities/organizer.entity";
import { OrganizerController } from "./organizer.controller";
import { OrganizerService } from "./organizer.service";

@Module({
  imports: [ObjectionModule.forFeature([Organizer])],
  providers: [OrganizerService],
  controllers: [OrganizerController],
})
export class OrganizerModule {}
