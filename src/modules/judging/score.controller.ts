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
import { Score } from "entities/score.entity";
import { OmitType, PartialType } from "@nestjs/swagger";

class CreateEntity extends OmitType(Score, ["id"] as const) {}

class PatchEntity extends PartialType(CreateEntity) {}

@Controller("judging/scores")
export class ScoreController {
  constructor(
    @InjectRepository(Score)
    private readonly scoreRepo: Repository<Score>,
  ) {}

  @Get("/")
  async getAll(): Promise<Score[]> {
    return this.scoreRepo
      .findAll()
      .byHackathon()
      .withGraphFetched("[project, judge]");
  }

  @Post("/")
  async createOne(@Body("data") data: CreateEntity) {
    return this.scoreRepo
      .createOne(data)
      .raw()
      .withGraphFetched("[project, judge]");
  }

  @Get(":id")
  async getOne(@Param("id") id: number) {
    return this.scoreRepo
      .findOne(id)
      .raw()
      .withGraphFetched("[project, judge]");
  }

  @Patch(":id")
  async patchOne(@Param("id") id: number, @Body("data") data: PatchEntity) {
    return this.scoreRepo
      .patchOne(id, data)
      .raw()
      .withGraphFetched("[project, judge]");
  }

  @Put(":id")
  async replaceOne(@Param("id") id: number, @Body("data") data: CreateEntity) {
    return this.scoreRepo
      .replaceOne(id, data)
      .raw()
      .withGraphFetched("[project, judge]");
  }

  @Delete(":id")
  async deleteOne(@Param(":id") id: number) {
    return this.scoreRepo.deleteOne(id).exec();
  }
}
