import { Injectable } from "@nestjs/common";
import * as admin from "firebase-admin";
import {
  CloudStorageEmail,
  DefaultFromEmail,
  DefaultFromName,
} from "common/sendgrid/sendgrid.constants";
import Handlebars from "handlebars";
import * as mjml2html from "mjml";
import { Express } from "express";
import { InjectSendGrid } from "common/sendgrid/sendgrid-mail.decorator";
import { MailService } from "@sendgrid/mail";
import { SendEmailOptions } from "common/sendgrid/sendgrid.types";

@Injectable()
export class SendGridService {
  constructor(@InjectSendGrid() private readonly sendGrid: MailService) {}

  private file(filepath: string) {
    return admin.storage().bucket().file(`${CloudStorageEmail}${filepath}`);
  }

  private async getBaseTemplate() {
    return this.file("/template.mjml").download();
  }

  async send(options: SendEmailOptions) {
    const { from, fromName, to, subject, reply, message, attachments } =
      options;

    return this.sendGrid.send({
      from: {
        email: from ?? DefaultFromEmail,
        name: fromName ?? DefaultFromName,
      },
      to,
      subject,
      replyTo: reply ?? from,
      html: message,
      attachments: attachments?.map((attachment) => ({
        content: attachment.content,
        filename: attachment.filename,
        type: attachment.type,
        disposition: attachment.disposition,
      })),
    });
  }

  async sendBatch(emails: SendEmailOptions[]) {
    const messages = emails.map((options) => {
      const { from, fromName, to, subject, reply, message, attachments } =
        options;

      return {
        from: {
          email: from ?? DefaultFromEmail,
          name: fromName ?? DefaultFromName,
        },
        to,
        subject,
        replyTo: reply ?? from,
        html: message,
        attachments: attachments?.map((attachment) => ({
          content: attachment.content,
          filename: attachment.filename,
          type: attachment.type,
          disposition: attachment.disposition,
        })),
      };
    });

    return this.sendGrid.sendMultiple({
      ...messages[0],
      personalizations: messages.map((msg) => ({
        to: Array.isArray(msg.to)
          ? msg.to.map((email) => ({ email }))
          : [{ email: msg.to }],
        subject: msg.subject,
      })),
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
