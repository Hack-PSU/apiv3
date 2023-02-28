import { IsOptional, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class SendMailBody {
  @ApiProperty({ example: "registration" })
  template: string;

  @ApiProperty({ example: { name: "user" } })
  data: Record<string, any>;
}

export class UploadTemplateBody {
  @ApiProperty()
  @IsString()
  name: string;

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
