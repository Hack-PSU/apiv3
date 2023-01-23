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
import { Project } from "entities/project.entity";
import { OmitType, PartialType } from "@nestjs/swagger";

class CreateEntity extends OmitType(Project, ["id"] as const) {}

class PatchEntity extends PartialType(CreateEntity) {}

@Controller("judging/projects")
export class ProjectController {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
  ) {}

  @Get("/")
  async getAll() {
    return this.projectRepo.findAll().byHackathon();
  }

  @Post("/")
  async createOne(@Body("data") data: CreateEntity) {
    return this.projectRepo.createOne(data).exec();
  }

  @Get(":id")
  async getOne(@Param("id") id: number) {
    return this.projectRepo.findOne(id).exec();
  }

  @Patch(":id")
  async patchOne(@Param("id") id: number, @Body("data") data: PatchEntity) {
    return this.projectRepo.patchOne(id, data).exec();
  }

  @Put(":id")
  async replaceOne(@Param("id") id: number, @Body("data") data: CreateEntity) {
    return this.projectRepo.replaceOne(id, data).exec();
  }

  @Delete(":id")
  async deleteOne(@Param("id") id: number) {
    return this.projectRepo.deleteOne(id).exec();
  }
}
