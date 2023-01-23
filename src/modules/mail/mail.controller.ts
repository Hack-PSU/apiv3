import { Body, Controller, Post } from "@nestjs/common";
import { EmailService } from "common/email/email.service";
import { SendMailBody } from "modules/mail/mail.interface";

@Controller("mail")
export class MailController {
  constructor(private readonly emailService: EmailService) {}

  @Post("send")
  async sendMail(@Body() body: SendMailBody) {
    console.log(
      await this.emailService.populateTemplate(body.template, body.data),
    );
  }
}
