import { Module } from "@nestjs/common";
import { EmailModule } from "common/email/email.module";
import { MailController } from "./mail.controller";

@Module({
  imports: [EmailModule],
  controllers: [MailController],
})
export class MailModule {}
