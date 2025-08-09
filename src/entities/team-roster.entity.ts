import { ApiProperty, PickType } from "@nestjs/swagger";
import { Column, ID, Table } from "common/objection";
import { Entity } from "entities/base.entity";
import { IsEnum, IsString, IsNumber } from "class-validator";
import { User } from "./user.entity";
import { Hackathon } from "./hackathon.entity";

export enum TeamRole {
  LEAD = "lead",
  MEMBER = "member",
}

@Table({
  name: "team_roster",
  relationMappings: {
    user: {
      relation: Entity.BelongsToOneRelation,
      modelClass: User,
      join: {
        from: "team_roster.userId",
        to: "users.id",
      },
    },
    hackathon: {
      relation: Entity.BelongsToOneRelation,
      modelClass: Hackathon,
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
  hackathonId: string;

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
  @IsNumber()
  @Column({ type: "integer" })
  updatedAt: number;

  // Relations
  user?: User;
  hackathon?: Hackathon;
}

export class TeamRosterEntity extends PickType(TeamRoster, [
  "id",
  "hackathonId",
  "teamId",
  "teamName",
  "userId",
  "role",
  "joinedAt",
  "updatedAt",
] as const) {}
