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
import { User } from "entities/user.entity";
import { OmitType, PartialType } from "@nestjs/swagger";
import { SocketGateway } from "modules/socket/socket.gateway";
import { RestrictedRoles, Role } from "common/firebase";

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
  @RestrictedRoles({
    roles: [Role.NONE],
    handler: (req) => req.params.id,
  })
  async getOne(@Param("id") id: string) {
    return this.userRepo.findOne(id).byHackathon();
  }

  @Patch(":id")
  async patchOne(@Param("id") id: string, @Body("data") data: PatchEntity) {
    const user = await this.userRepo.patchOne(id, data).exec();
    this.socket.emit("update:user", user);

    return user;
  }

  @Put(":id")
  async replaceOne(@Param("id") id: string, @Body("data") data: CreateEntity) {
    const user = await this.userRepo.replaceOne(id, data).exec();
    this.socket.emit("update:user", user);

    return user;
  }

  @Delete(":id")
  async deleteOne(@Param("id") id: string) {
    const user = await this.userRepo.deleteOne(id).exec();
    this.socket.emit("update:user", user);

    return user;
  }
}
