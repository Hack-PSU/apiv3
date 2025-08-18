import { ApiProperty, PickType } from "@nestjs/swagger";
import { Column, ID, Table } from "common/objection";
import { Entity } from "entities/base.entity";
import { IsBoolean, IsOptional, IsString } from "class-validator";

@Table({
  name: "teams",
})
export class Team extends Entity {
  @ApiProperty()
  @IsString()
  @Column({ type: "string" })
  hackathonId: string;
  @ApiProperty()
  @IsString()
  @ID({ type: "string" })
  id: string;

  @ApiProperty()
  @IsString()
  @Column({ type: "string" })
  name: string;

  @ApiProperty({ type: "string", required: false, nullable: true })
  @IsOptional()
  @IsString()
  @Column({ type: "string", required: false, nullable: true })
  member1?: string;

  @ApiProperty({ type: "string", required: false, nullable: true })
  @IsOptional()
  @IsString()
  @Column({ type: "string", required: false, nullable: true })
  member2?: string;

  @ApiProperty({ type: "string", required: false, nullable: true })
  @IsOptional()
  @IsString()
  @Column({ type: "string", required: false, nullable: true })
  member3?: string;

  @ApiProperty({ type: "string", required: false, nullable: true })
  @IsOptional()
  @IsString()
  @Column({ type: "string", required: false, nullable: true })
  member4?: string;

  @ApiProperty({ type: "string", required: false, nullable: true })
  @IsOptional()
  @IsString()
  @Column({ type: "string", required: false, nullable: true })
  member5?: string;

  @ApiProperty()
  @IsBoolean()
  @Column({ type: "boolean" })
  isActive: boolean;
}

export class TeamEntity extends PickType(Team, [
  "id",
  "hackathonId",
  "name",
  "member1",
  "member2",
  "member3",
  "member4",
  "member5",
  "isActive",
] as const) {}
