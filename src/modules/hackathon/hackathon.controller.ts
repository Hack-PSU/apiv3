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
import { Hackathon } from "entities/hackathon.entity";
import { OmitType, PartialType } from "@nestjs/swagger";
import { Role, Roles } from "common/firebase";
import { SocketGateway } from "modules/socket/socket.gateway";

class UpdateEntity extends OmitType(Hackathon, ["id"] as const) {}

class CreateEntity extends OmitType(UpdateEntity, ["active"] as const) {}

class PatchEntity extends PartialType(UpdateEntity) {}

@Controller("hackathons")
export class HackathonController {
  constructor(
    @InjectRepository(Hackathon)
    private readonly hackathonRepo: Repository<Hackathon>,
    private readonly socket: SocketGateway,
  ) {}

  @Get("/")
  @Roles(Role.TEAM)
  async getAll() {
    return this.hackathonRepo.findAll();
  }

  @Post("/")
  async createOne(@Body("data") data: CreateEntity) {
    const newHackathonId = crypto.randomUUID().replace(/-/g, "");

    await Hackathon.query().patch({ active: false }).where("active", true);

    return this.hackathonRepo.withEmit(
      () =>
        this.hackathonRepo.createOne({
          ...data,
          id: newHackathonId,
          active: true,
        }),
      () => this.socket.emit("update:hackathon", {}),
    );
  }

  @Get("/active")
  async getActive() {
    return Hackathon.query().where("active", true);
  }

  @Get(":id")
  async getOne(@Param("id") id: string) {
    return this.hackathonRepo.findOne(id);
  }

  @Patch(":id")
  async patchOne(@Param("id") id: string, @Body("data") data: PatchEntity) {
    return this.hackathonRepo.withEmit(
      () => this.hackathonRepo.patchOne(id, data),
      () => this.socket.emit("update:hackathon", {}),
    );
  }

  @Put(":id")
  async replaceOne(@Param("id") id: string, @Body("data") data: UpdateEntity) {
    return this.hackathonRepo.withEmit(
      () => this.hackathonRepo.replaceOne(id, data),
      () => this.socket.emit("update:hackathon", {}),
    );
  }

  @Delete(":id")
  async deleteOne(@Param("id") id: string) {
    return this.hackathonRepo.withEmit(
      () => this.hackathonRepo.deleteOne(id),
      () => this.socket.emit("update:hackathon", {}),
    );
  }

  @Post(":id/active")
  async markActive(@Param("id") id: string) {
    // mark current as inactive
    await Hackathon.query().patch({ active: false }).where("active", true);

    // mark new hackathon as active
    return this.hackathonRepo.withEmit(
      () => this.hackathonRepo.patchOne(id, { active: true }),
      () => this.socket.emit("update:hackathon", {}),
    );
  }
}
