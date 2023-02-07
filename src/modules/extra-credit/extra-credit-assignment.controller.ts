import { Controller, Get, Param } from "@nestjs/common";
import { InjectRepository, Repository } from "common/objection";
import { ExtraCreditAssignment } from "entities/extra-credit-assignment.entity";

@Controller("extra-credit/assignments")
export class ExtraCreditAssignmentController {
  constructor(
    @InjectRepository(ExtraCreditAssignment)
    private readonly ecAssignmentRepo: Repository<ExtraCreditAssignment>,
  ) {}

  @Get("/")
  async getAll() {
    return this.ecAssignmentRepo.findAll().exec();
  }

  @Get(":id")
  async getOne(@Param("id") id: number) {
    return this.ecAssignmentRepo.findOne(id).exec();
  }
}
