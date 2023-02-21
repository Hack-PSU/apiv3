import { Controller, Get, Param } from "@nestjs/common";
import { InjectRepository, Repository } from "common/objection";
import {
  ExtraCreditAssignment,
  ExtraCreditAssignmentEntity,
} from "entities/extra-credit-assignment.entity";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { ApiAuth } from "common/docs/api-auth.decorator";
import { Role, Roles } from "common/gcp";

@ApiTags("Extra Credit")
@Controller("extra-credit/assignments")
export class ExtraCreditAssignmentController {
  constructor(
    @InjectRepository(ExtraCreditAssignment)
    private readonly ecAssignmentRepo: Repository<ExtraCreditAssignment>,
  ) {}

  @Get("/")
  @Roles(Role.TEAM)
  @ApiOperation({ summary: "Get All Extra Credit Assignments" })
  @ApiOkResponse({ type: [ExtraCreditAssignmentEntity] })
  @ApiAuth(Role.TEAM)
  async getAll() {
    return this.ecAssignmentRepo.findAll().exec();
  }

  @Get(":id")
  @Roles(Role.TEAM)
  @ApiOperation({ summary: "Get an Extra Credit Assignment" })
  @ApiOkResponse({ type: ExtraCreditAssignmentEntity })
  @ApiAuth(Role.TEAM)
  async getOne(@Param("id") id: number) {
    return this.ecAssignmentRepo.findOne(id).exec();
  }
}
