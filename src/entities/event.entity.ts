import { ApiProperty, PickType } from "@nestjs/swagger";
import { Column, ID, Table } from "common/objection";
import { Entity } from "@entities/base.entity";
import { Type } from "class-transformer";
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  ValidateIf,
} from "class-validator";
import Objection from "objection";

enum EventType {
  activity = "activity",
  food = "food",
  workshop = "workshop",
  checkIn = "checkIn",
}

@Table({
  name: "events",
  relationMappings: {
    location: {
      relation: Entity.BelongsToOneRelation,
      modelClass: "location.entity.js",
      join: {
        from: "events.locationId",
        to: "locations.id",
      },
    },
    scans: {
      relation: Entity.HasManyRelation,
      modelClass: "scan.entity.js",
      filter: (qb) =>
        qb.select("scans.eventId", "scans.userId", "scans.organizerId"),
      join: {
        from: "events.id",
        to: "scans.eventId",
      },
    },
  },
  hackathonId: "hackathonId",
})
export class Event extends Entity {
  @ApiProperty()
  @IsString()
  @ID({ type: "string" })
  id: string;

  @ApiProperty()
  @IsString()
  @Column({ type: "string" })
  name: string;

  @ApiProperty()
  @IsEnum(EventType)
  @Column({ type: "string" })
  type: "activity" | "food" | "workshop" | "checkIn";

  @ApiProperty()
  @IsOptional()
  @IsString()
  @Column({ type: "string", required: false, nullable: true })
  description: string;

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Column({ type: "integer", required: false, nullable: true })
  locationId: number;

  @ApiProperty()
  @Column({ type: "string", required: false, nullable: true })
  icon?: string;

  @ApiProperty()
  @IsNumber()
  @Type(() => Number)
  @Column({ type: "integer" })
  startTime: number;

  @ApiProperty()
  @IsNumber()
  @Type(() => Number)
  @Column({ type: "integer" })
  endTime: number;

  @ApiProperty({ required: false })
  @ValidateIf((o) => o.type === EventType.workshop)
  @IsOptional()
  @IsString()
  @Column({ type: "string", required: false, nullable: true })
  wsPresenterNames?: string;

  @ApiProperty({ required: false })
  @ValidateIf((o) => o.type === EventType.workshop)
  @IsOptional()
  @IsString()
  @Column({ type: "string", required: false, nullable: true })
  wsRelevantSkills?: string;

  @ApiProperty({ required: false })
  @ValidateIf((o) => o.type === EventType.workshop)
  @IsOptional()
  @IsString()
  @Column({ type: "string", required: false, nullable: true })
  wsSkillLevel?: string;

  @ApiProperty({ required: false })
  @ValidateIf((o) => o.type === EventType.workshop)
  @IsOptional()
  @IsString()
  @Column({ type: "string", required: false, nullable: true })
  wsUrls?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Column({ type: "string", nullable: true, required: false })
  hackathonId?: string;

  $formatJson(json: Objection.Pojo): Objection.Pojo {
    json = super.$formatJson(json);

    if ("wsUrls" in json) {
      return {
        ...json,
        ...(json["wsUrls"]
          ? { wsUrls: json["wsUrls"].split("|") }
          : { wsUrls: [] }),
      };
    }
    return json;
  }
}

export class EventEntity extends PickType(Event, [
  "id",
  "name",
  "type",
  "description",
  "locationId",
  "icon",
  "startTime",
  "endTime",
  "wsPresenterNames",
  "wsRelevantSkills",
  "wsSkillLevel",
  "wsUrls",
  "hackathonId",
] as const) {}
