import {
  IsArray,
  IsEmail,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import { ApiProperty, OmitType } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { DefaultFromEmail } from "common/sendgrid/sendgrid.constants";

export class SendMailBody {
  @ApiProperty({ required: true, example: "user@email.com" })
  @IsArray({ each: true })
  @IsEmail()
  to: string[];

  @ApiProperty({ example: "registration" })
  @IsString()
  template: string;

  @ApiProperty({ example: "Email Subject" })
  @IsString()
  subject: string;

  @ApiProperty({ example: { name: "user" } })
  @IsObject()
  data: Record<string, any>;

  @ApiProperty({ required: false, example: "team@hackpsu.org" })
  @IsOptional()
  @IsEmail()
  @Transform((value) => value || DefaultFromEmail)
  from: string;
}

export class PreviewMailBody extends OmitType(SendMailBody, [
  "from",
  "to",
  "subject",
  "template",
] as const) {}

export class PreviewMailResponse {
  @ApiProperty()
  html: string;
}

class SendBatchReceiver {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsObject()
  data: Record<string, any>;
}

export class SendBatchMailBody extends OmitType(SendMailBody, [
  "to",
  "data",
] as const) {
  @ApiProperty({ type: [SendBatchReceiver] })
  @ValidateNested({ each: true })
  @Type(() => SendBatchReceiver)
  to: SendBatchReceiver[];
}

export class UploadTemplateBody {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ type: "string", format: "binary" })
  template: any;

  @ApiProperty({
    required: false,
    description:
      "This text will be used as the default preview text. If null, this field " +
      "can be personalized when sending an email.",
  })
  @IsOptional()
  @IsString()
  previewText?: string;
}

export class TemplateMetadata {
  @ApiProperty()
  name: string;

  @ApiProperty()
  context: string[];
}
