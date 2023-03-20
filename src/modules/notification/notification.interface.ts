import { ApiProperty } from "@nestjs/swagger";
import {
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from "class-validator";
import { DefaultTopic } from "common/gcp/messaging";

export class MessageEntity {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  body: string;

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  scheduleTime?: number;

  @ApiProperty()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UserMessageEntity extends MessageEntity {
  @ApiProperty()
  @IsString()
  userId: string;
}

export class BroadcastMessageEntity extends MessageEntity {
  @ApiProperty()
  @IsOptional()
  @IsEnum(DefaultTopic)
  broadcast?: DefaultTopic;

  @ApiProperty()
  @IsOptional()
  @IsString()
  topic?: string;
}
