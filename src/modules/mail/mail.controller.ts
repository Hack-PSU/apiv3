import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
  ValidationPipe,
} from "@nestjs/common";
import { EmailService } from "common/email/email.service";
import {
  SendMailBody,
  TemplateMetadata,
  UploadTemplateBody,
} from "modules/mail/mail.interface";
import { FileInterceptor } from "@nestjs/platform-express";
import { Express } from "express";
import { ApiExtraModels, ApiTags } from "@nestjs/swagger";
import { ApiDoc } from "common/docs";
import { Role, Roles } from "common/gcp";

@ApiTags("Mail")
@Controller("mail")
@ApiExtraModels(TemplateMetadata)
export class MailController {
  constructor(private readonly emailService: EmailService) {}

  @Post("send")
  @Roles(Role.TEAM)
  @ApiDoc({
    summary: "Send an email using an uploaded template",
    auth: Role.TEAM,
    request: {
      body: { type: SendMailBody },
    },
    response: {
      noContent: true,
    },
  })
  async sendMail(@Body() body: SendMailBody) {
    return this.emailService.populateTemplate(body.template, body.data);
  }

  @Post("template")
  @UseInterceptors(FileInterceptor("template"))
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(Role.TEAM)
  @ApiDoc({
    summary: "Upload a new email template",
    request: {
      mimeTypes: ["multipart/form-data"],
      body: { type: UploadTemplateBody },
      validate: true,
    },
    response: {
      noContent: true,
    },
    auth: Role.TEAM,
  })
  async uploadTemplate(
    @Body(
      new ValidationPipe({
        forbidNonWhitelisted: true,
        whitelist: true,
        transform: true,
      }),
    )
    body: UploadTemplateBody,
    @UploadedFile() template: Express.Multer.File,
  ) {
    const newTemplate = await this.emailService.createTemplate(
      template,
      body.previewText,
    );

    await this.emailService.uploadTemplate(newTemplate, body.name);
  }

  @Get("template/:templateId/metadata")
  @Roles(Role.TEAM)
  @ApiDoc({
    summary: "Get All Template Metadata",
    params: [
      {
        name: "templateId",
        description: "ID must be set to a template's name or ID",
      },
    ],
    response: {
      ok: { type: TemplateMetadata },
    },
    auth: Role.TEAM,
  })
  async getTemplateMetadata(@Param("templateId") templateId: string) {
    const template = await this.emailService.fetchTemplate(templateId);
    const context = this.emailService.extractContext(template.toString());

    return {
      name: templateId,
      context,
    };
  }
}
