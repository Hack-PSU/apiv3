import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
} from "@nestjs/common";
import { InjectRepository, Repository } from "common/objection";
import { ExtraCreditClass } from "entities/extra-credit-class.entity";
import { OmitType, PartialType } from "@nestjs/swagger";

class CreateEntity extends OmitType(ExtraCreditClass, ["id"] as const) {}

class PatchEntity extends PartialType(CreateEntity) {}

@Controller("extra-credit/classes")
export class ExtraCreditClassController {
  constructor(
    @InjectRepository(ExtraCreditClass)
    private readonly ecClassRepo: Repository<ExtraCreditClass>,
  ) {}

  @Get("/")
  async getAll() {
    return this.ecClassRepo.findAll().exec();
  }

  @Post("/")
  async createOne(@Body("data") data: CreateEntity) {
    return this.ecClassRepo.createOne(data).exec();
  }

  @Get(":id")
  async getOne(@Param("id") id: number) {
    return this.ecClassRepo.findOne(id).raw().withGraphFetched("users");
  }

  @Put(":id")
  async replaceOne(@Param("id") id: number, @Body("data") data: CreateEntity) {
    return this.ecClassRepo.replaceOne(id, data).exec();
  }

  @Patch(":id")
  async patchOne(@Param("id") id: number, @Body("data") data: PatchEntity) {
    return this.ecClassRepo.patchOne(id, data).exec();
  }

  @Delete(":id")
  async deleteOne(@Param("id") id: number) {
    return this.ecClassRepo.deleteOne(id).exec();
  }
}
