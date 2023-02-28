import { Injectable } from "@nestjs/common";
import * as admin from "firebase-admin";
import { CloudStorageEmail } from "common/sendgrid/sendgrid.constants";
import Handlebars from "handlebars";
import * as mjml2html from "mjml";
import { Express } from "express";
import { InjectSendGrid } from "common/sendgrid/sendgrid-mail.decorator";
import { MailService } from "@sendgrid/mail";

@Injectable()
export class SendGridService {
  constructor(@InjectSendGrid() private readonly sendGrid: MailService) {}

  private file(filepath: string) {
    return admin.storage().bucket().file(`${CloudStorageEmail}${filepath}`);
  }

  private async getBaseTemplate() {
    return this.file("/template.mjml").download();
  }

  async send(from: string, to: string, subject: string, message: string) {
    return this.sendGrid.send({
      from,
      to,
      subject,
      replyTo: from,
      html: message,
    });
  }

  async createTemplate(template: Express.Multer.File, previewText?: string) {
    const base = await this.getBaseTemplate();
    const emailTemplate = Handlebars.compile(base.toString());

    return emailTemplate({
      previewText: previewText ?? "{{ previewText }}",
      body: template.buffer.toString(),
    });
  }

  async fetchTemplate(template: string) {
    return this.file(`/templates/${template}.mjml`).download();
  }

  async uploadTemplate(template: string, filename: string) {
    await this.file(`/templates/${filename}.mjml`).save(template);
  }

  async populateTemplate(filename: string, data: any): Promise<string> {
    const file = await this.file(`/templates/${filename}.mjml`).download();

    const template = Handlebars.compile(file.toString());
    const emailTemplate = template(data);

    return mjml2html(emailTemplate).html;
  }

  extractContext(template: string) {
    const contextExp = new RegExp(
      /{{{? *(?:#[a-z]+ )?(?<var>[a-zA-Z]+\.?[a-zA-Z]*) *}?}}/g,
    );

    return Array.from(
      template.matchAll(contextExp),
      (match) => match.groups.var,
    );
  }
}
