import { Module } from "@nestjs/common";
import { SendGridModule } from "common/sendgrid/sendgrid.module";
import { MailController } from "./mail.controller";

@Module({
  imports: [SendGridModule],
  controllers: [MailController],
})
export class MailModule {}
