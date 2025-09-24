import { Column, ID, Table } from "common/objection";
import { Entity } from "entities/base.entity";
import { ApiProperty, PickType } from "@nestjs/swagger";
import { IsString, IsNumber, IsBoolean, IsEnum } from "class-validator";

export enum TeamRole {
  LEAD = "lead",
  MEMBER = "member",
}

@Table({
  name: "team_roster",
  hackathonId: "hackathonId",
  relationMappings: {
    user: {
      relation: Entity.BelongsToOneRelation,
      modelClass: "user.entity.js",
      join: {
        from: "team_roster.userId",
        to: "users.id",
      },
    },
    hackathon: {
      relation: Entity.BelongsToOneRelation,
      modelClass: "hackathon.entity.js",
      join: {
        from: "team_roster.hackathonId",
        to: "hackathons.id",
      },
    },
  },
})
export class TeamRoster extends Entity {
  @ApiProperty()
  @IsString()
  @ID({ type: "string" })
  id: string;

  @ApiProperty()
  @IsString()
  @Column({ type: "string" })
  teamId: string;

  @ApiProperty()
  @IsString()
  @Column({ type: "string" })
  teamName: string;

  @ApiProperty()
  @IsString()
  @Column({ type: "string" })
  userId: string;

  @ApiProperty({ enum: TeamRole })
  @IsEnum(TeamRole)
  @Column({ type: "string" })
  role: TeamRole;

  @ApiProperty()
  @IsNumber()
  @Column({ type: "integer" })
  joinedAt: number;

  @ApiProperty()
  @IsBoolean()
  @Column({ type: "boolean", required: true })
  isActive: boolean = true;

  @ApiProperty()
  @IsString()
  @Column({ type: "string" })
  hackathonId: string;
}

export class TeamRosterEntity extends PickType(TeamRoster, [
  "id",
  "teamId",
  "teamName",
  "userId",
  "role",
  "joinedAt",
  "isActive",
  "hackathonId",
] as const) {}