import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Put,
} from "@nestjs/common";
import { InjectRepository, Repository } from "common/objection";
import { User } from "entities/user.entity";
import { OmitType, PartialType } from "@nestjs/swagger";

class CreateEntity extends OmitType(User, ["id"] as const) {}

class PatchEntity extends PartialType(CreateEntity) {}

@Controller("users")
export class UserController {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  @Get("/")
  async getAll() {
    return this.userRepo.findAll();
  }

  @Post("/")
  async createOne(@Body("data") data: CreateEntity) {
    return this.userRepo.createOne(data);
  }

  @Get(":id")
  async getOne(id: string) {
    return this.userRepo.findOne(id);
  }

  @Patch(":id")
  async patchOne(id: string, @Body("data") data: PatchEntity) {
    return this.userRepo.patchOne(id, data);
  }

  @Put(":id")
  async replaceOne(id: string, @Body("data") data: CreateEntity) {
    return this.userRepo.replaceOne(id, data);
  }

  @Delete(":id")
  async deleteOne(id: string) {
    return this.userRepo.deleteOne(id);
  }
}
