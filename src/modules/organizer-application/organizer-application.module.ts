import { Module } from "@nestjs/common";
import { ObjectionModule } from "common/objection";
import { OrganizerApplication } from "entities/organizer-application.entity";
import { OrganizerApplicationController } from "./organizer-application.controller";
import { OrganizerApplicationService } from "./organizer-application.service";

@Module({
  imports: [ObjectionModule.forFeature([OrganizerApplication])],
  controllers: [OrganizerApplicationController],
  providers: [OrganizerApplicationService],
})
export class OrganizerApplicationModule {}
