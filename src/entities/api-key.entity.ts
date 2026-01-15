import { ApiProperty } from "@nestjs/swagger";
import { Entity } from "entities/base.entity";
import { Table, ID, Column } from "common/objection";

@Table({
  name: "api_keys",
})
export class ApiKey extends Entity {
  @ApiProperty()
  @ID({ type: "string" })
  id: string;

  @ApiProperty()
  @Column({ type: "string" })
  name: string;

  @Column({ type: "string" })
  valueHash: string;

  @Column({ type: "string" })
  prefix: string;

  @ApiProperty({ nullable: true })
  @Column({ type: "string", required: false, nullable: true })
  lastUsedAt?: string;

  @ApiProperty({ nullable: true })
  @Column({ type: "string", required: false, nullable: true })
  revokedAt?: string;

  @ApiProperty()
  @Column({ type: "string", required: false })
  createdAt: string;
}
