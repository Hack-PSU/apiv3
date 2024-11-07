import { ApiProperty, PickType } from "@nestjs/swagger";
import { IsEnum, IsNumber, IsString } from "class-validator";
import { Entity } from "entities/base.entity";
import { ID, Column, Table } from "common/objection";

enum Status {
  PENDING,
  APPROVED,
  REJECTED,
}
@Table({
  name: "finances",
  relationMappings: {
    user: {
      relation: Entity.BelongsToOneRelation,
      modelClass: "user.entity.js",
      join: {
        from: "finances.userId",
        to: "users.id",
      },
    },
    organizer: {
      relation: Entity.BelongsToOneRelation,
      modelClass: "organizer.entity.js",
      join: {
        from: "finances.organizerId",
        to: "organizers.id",
      },
    },
  },
})
export class Finance extends Entity {
  @ApiProperty()
  @IsString()
  @ID({ type: "string" })
  id: string;

  @ApiProperty()
  @IsNumber()
  @Column({ type: "number" })
  amount: number;

  @ApiProperty()
  @IsEnum(Status)
  @Column({ type: "string" })
  status: Status;

  @ApiProperty()
  @IsString()
  @Column({ type: "string" })
  userId: string;

  @ApiProperty()
  @IsString()
  @Column({ type: "string" })
  organizerId: string;

  @ApiProperty()
  @IsString()
  @Column({ type: "string" })
  linkAddress: string;

  @ApiProperty()
  @IsString()
  @Column({ type: "string" })
  hackathonID: string;
}

export class FinanceEntity extends PickType(Finance, [
  "id",
  "amount",
  "status",
  "userId",
  "organizerId",
  "linkAddress",
  "hackathonID",
] as const) {}
