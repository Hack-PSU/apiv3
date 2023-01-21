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
    return this.hackathonRepo.findAll().exec();
  }

  @Post("/")
  async createOne(@Body("data") data: CreateEntity) {
    const newHackathonId = crypto.randomUUID().replace(/-/g, "");

    await Hackathon.query().patch({ active: false }).where("active", true);

    const newHackathon = await this.hackathonRepo
      .createOne({
        ...data,
        id: newHackathonId,
        active: true,
      })
      .exec();

    this.socket.emit("create:hackathon", newHackathon);

    return newHackathon;
  }

  @Get("/active")
  async getActive() {
    return Hackathon.query().where("active", true);
  }

  @Get(":id")
  async getOne(@Param("id") id: string) {
    return this.hackathonRepo.findOne(id).exec();
  }

  @Patch(":id")
  async patchOne(@Param("id") id: string, @Body("data") data: PatchEntity) {
    const hackathon = await this.hackathonRepo.patchOne(id, data).exec();
    this.socket.emit("update:hackathon", hackathon);

    return hackathon;
  }

  @Put(":id")
  async replaceOne(@Param("id") id: string, @Body("data") data: UpdateEntity) {
    const hackathon = await this.hackathonRepo.replaceOne(id, data).exec();
    this.socket.emit("update:hackathon", hackathon);

    return hackathon;
  }

  @Delete(":id")
  async deleteOne(@Param("id") id: string) {
    const hackathon = await this.hackathonRepo.deleteOne(id).exec();
    this.socket.emit("delete:hackathon", hackathon);

    return hackathon;
  }

  @Post(":id/active")
  async markActive(@Param("id") id: string) {
    // mark current as inactive
    await Hackathon.query().patch({ active: false }).where("active", true);

    // mark new hackathon as active
    const hackathon = await this.hackathonRepo
      .patchOne(id, { active: true })
      .exec();

    this.socket.emit("update:hackathon", hackathon);

    return hackathon;
  }
}
