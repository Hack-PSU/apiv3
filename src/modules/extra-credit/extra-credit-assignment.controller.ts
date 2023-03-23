import { Controller, Get, UseFilters } from "@nestjs/common";
import { InjectRepository, Repository } from "common/objection";
import { ApiTags } from "@nestjs/swagger";
import { Role, Roles } from "common/gcp";
import { ApiDoc } from "common/docs";
import { DBExceptionFilter } from "common/filters";
import { ExtraCreditClass } from "entities/extra-credit-class.entity";
import { ECClassResponse } from "./extra-credit-class.controller";

@ApiTags("Extra Credit")
@Controller("extra-credit/assignments")
@UseFilters(DBExceptionFilter)
export class ExtraCreditAssignmentController {
  constructor(
    @InjectRepository(ExtraCreditClass)
    private readonly ecClassRepo: Repository<ExtraCreditClass>,
  ) {}

  @Get("/")
  @Roles(Role.TEAM)
  @ApiDoc({
    summary: "Get All Extra Credit Assignments",
    response: {
      ok: { type: [ECClassResponse] },
    },
    auth: Role.TEAM,
  })
  async getAll() {
    return this.ecClassRepo.findAll().byHackathon().withGraphFetched("users");
  }
}
