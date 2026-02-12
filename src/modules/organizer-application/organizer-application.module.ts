import { Module } from "@nestjs/common";
import { ObjectionModule } from "common/objection";
import { OrganizerApplication } from "entities/organizer-application.entity";
import { Organizer } from "entities/organizer.entity";
import { OrganizerApplicationController } from "./organizer-application.controller";
import { OrganizerApplicationService } from "./organizer-application.service";
import { SendGridModule } from "common/sendgrid/sendgrid.module";

@Module({
  imports: [
    ObjectionModule.forFeature([OrganizerApplication, Organizer]),
    SendGridModule,
  ],
  controllers: [OrganizerApplicationController],
  providers: [OrganizerApplicationService],
})
export class OrganizerApplicationModule {}
