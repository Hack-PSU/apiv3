import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
} from "@nestjs/common";
import { InjectRepository, Repository } from "common/objection";
import { Organizer, OrganizerEntity } from "entities/organizer.entity";
import { SocketGateway } from "modules/socket/socket.gateway";
import { OmitType, PartialType } from "@nestjs/swagger";
import { FirebaseAuthService } from "common/gcp";
import { take, toArray } from "rxjs";
import { OrganizerService } from "modules/organizer/organizer.service";
import { SocketRoom } from "common/socket";

class CreateEntity extends OrganizerEntity {}

class UpdateEntity extends PartialType(
  OmitType(CreateEntity, ["id"] as const),
) {}

@Controller("organizers")
export class OrganizerController {
  constructor(
    @InjectRepository(Organizer)
    private readonly organizerRepo: Repository<Organizer>,
    private readonly socket: SocketGateway,
    private readonly auth: FirebaseAuthService,
    private readonly organizerService: OrganizerService,
  ) {}

  @Get("/")
  async getAll() {
    const organizers = await this.organizerRepo.findAll().exec();

    return this.organizerService.injectUserRoles(organizers).pipe(toArray());
  }

  @Post("/")
  async createOne(@Body("data") data: CreateEntity) {
    const userExists = await this.auth.validateUser(data.id);

    if (!userExists) {
      throw new HttpException("user not found", HttpStatus.BAD_REQUEST);
    }

    const { privilege, ...user } = data;

    const organizer = await this.organizerRepo.createOne(user).exec();

    await this.auth.updateUserClaims(data.id, privilege);
    this.socket.emit("create:organizer", organizer, SocketRoom.ADMIN);

    return organizer;
  }

  @Get(":id")
  async getOne(@Param("id") id: string) {
    const organizer = await this.organizerRepo.findOne(id).exec();

    return this.organizerService.injectUserRoles([organizer]).pipe(take(1));
  }

  @Patch(":id")
  async patchOne(@Param("id") id: string, @Body("data") data: UpdateEntity) {
    const organizer = await this.organizerRepo.patchOne(id, data).exec();

    if (data.privilege) {
      await this.auth.updateUserClaims(id, organizer.privilege);
    }

    this.socket.emit("update:organizer", organizer, SocketRoom.ADMIN);

    return this.organizerService.injectUserRoles([organizer]).pipe(take(1));
  }

  @Put(":id")
  async replaceOne(@Param("id") id: string, @Body("data") data: UpdateEntity) {
    const organizer = await this.organizerRepo.replaceOne(id, data).exec();

    await this.auth.updateUserClaims(id, organizer.privilege);
    this.socket.emit("update:organizer", organizer, SocketRoom.ADMIN);

    return this.organizerService.injectUserRoles([organizer]).pipe(take(1));
  }

  @Delete(":id")
  async deleteOne(@Param("id") id: string) {
    const organizer = await this.organizerRepo.deleteOne(id).exec();

    this.socket.emit("delete:organizer", organizer, SocketRoom.ADMIN);

    return organizer;
  }
}
