import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
  ValidationPipe,
} from "@nestjs/common";
import { SendGridService } from "common/sendgrid";
import {
  SendBatchMailBody,
  SendMailBody,
  TemplateMetadata,
  UploadTemplateBody,
} from "modules/mail/mail.interface";
import { FileInterceptor } from "@nestjs/platform-express";
import { Express, Response } from "express";
import { ApiExtraModels, ApiTags } from "@nestjs/swagger";
import { ApiDoc } from "common/docs";
import { Role, Roles } from "common/gcp";

@ApiTags("Mail")
@Controller("mail")
@ApiExtraModels(TemplateMetadata)
export class MailController {
  constructor(private readonly sendGridService: SendGridService) {}

  @Post("show")
  async getTemplate(@Body() body) {
    return this.sendGridService.populateTemplate(body.template, body.data);
  }

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
    dbException: false,
  })
  async sendMail(
    @Body(
      new ValidationPipe({
        forbidNonWhitelisted: true,
        whitelist: true,
        transform: true,
      }),
    )
    body: SendMailBody,
  ) {
    const { to, template, subject, data, from } = body;

    const message = await this.sendGridService.populateTemplate(template, data);

    return Promise.all(
      to.map((email) =>
        this.sendGridService.send(from, email, subject, message),
      ),
    );
  }

  @Post("send/batch")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiDoc({
    summary: "Send Personalized Email to Multiple Receivers",
    request: {
      body: { type: SendBatchMailBody },
      validate: true,
    },
    auth: Role.TEAM,
    response: {
      noContent: true,
      custom: [
        {
          type: [String],
          status: 207,
          description: "Partial Success -- Returns Failed Receivers",
        },
      ],
    },
    dbException: false,
  })
  async sendBatchMail(
    @Body(
      new ValidationPipe({
        forbidNonWhitelisted: true,
        whitelist: true,
        transform: true,
      }),
    )
    body: SendBatchMailBody,
    @Res({ passthrough: true })
    res: Response,
  ) {
    const { from, to, template, subject } = body;

    const batch = await Promise.allSettled(
      to.map(async ({ data, email }) => {
        const message = await this.sendGridService.populateTemplate(
          template,
          data,
        );

        try {
          return await this.sendGridService.send(from, email, subject, message);
        } catch (e) {
          throw email;
        }
      }),
    );

    const failedBatch = batch.filter(({ status }) => status === "rejected");

    if (failedBatch.length > 0) {
      const failedEmails = failedBatch
        .map((b) => (b.status === "rejected" ? b.reason : undefined))
        .filter(Boolean);

      return res.status(207).send(failedEmails);
    }
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
    dbException: false,
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
    const newTemplate = await this.sendGridService.createTemplate(
      template,
      body.previewText,
    );

    await this.sendGridService.uploadTemplate(newTemplate, body.name);
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
    dbException: false,
  })
  async getTemplateMetadata(@Param("templateId") templateId: string) {
    const template = await this.sendGridService.fetchTemplate(templateId);
    const context = this.sendGridService.extractContext(template.toString());

    return {
      name: templateId,
      context,
    };
  }
}
