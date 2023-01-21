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
import { SocketGateway } from "modules/socket/socket.gateway";

class CreateEntity extends OmitType(User, ["id"] as const) {}

class PatchEntity extends PartialType(CreateEntity) {}

@Controller("users")
export class UserController {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly socket: SocketGateway,
  ) {}

  @Get("/")
  async getAll() {
    return this.userRepo.findAll().byHackathon();
  }

  @Post("/")
  async createOne(@Body("data") data: CreateEntity) {
    const user = await this.userRepo.createOne(data).exec();
    this.socket.emit("create:user", user);

    return user;
  }

  @Get(":id")
  async getOne(id: string) {
    return this.userRepo.findOne(id).byHackathon();
  }

  @Patch(":id")
  async patchOne(id: string, @Body("data") data: PatchEntity) {
    const user = await this.userRepo.patchOne(id, data).exec();
    this.socket.emit("update:user", user);

    return user;
  }

  @Put(":id")
  async replaceOne(id: string, @Body("data") data: CreateEntity) {
    const user = await this.userRepo.replaceOne(id, data).exec();
    this.socket.emit("update:user", user);

    return user;
  }

  @Delete(":id")
  async deleteOne(id: string) {
    const user = await this.userRepo.deleteOne(id).exec();
    this.socket.emit("update:user", user);

    return user;
  }
}
