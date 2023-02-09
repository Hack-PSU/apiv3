import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
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
import {
  ApiBody,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  OmitType,
  PartialType,
} from "@nestjs/swagger";
import { FirebaseAuthService, Role } from "common/gcp";
import { take, toArray } from "rxjs";
import { OrganizerService } from "modules/organizer/organizer.service";
import { SocketRoom } from "common/socket";
import { ApiAuth } from "common/docs/api-auth";

class OrganizerCreateEntity extends OrganizerEntity {}

class OrganizerReplaceEntity extends OmitType(OrganizerCreateEntity, [
  "id",
] as const) {}

class OrganizerUpdateEntity extends PartialType(OrganizerReplaceEntity) {}

@ApiTags("Organizers")
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
  @ApiOperation({ summary: "Get All Organizers" })
  @ApiOkResponse({ type: [OrganizerEntity] })
  @ApiAuth(Role.EXEC)
  async getAll() {
    const organizers = await this.organizerRepo.findAll().exec();

    return this.organizerService.injectUserRoles(organizers).pipe(toArray());
  }

  @Post("/")
  @ApiOperation({ summary: "Create an Organizer" })
  @ApiBody({ type: OrganizerCreateEntity })
  @ApiOkResponse({ type: OrganizerEntity })
  @ApiAuth(Role.EXEC)
  async createOne(@Body() data: OrganizerCreateEntity) {
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
  @ApiOperation({ summary: "Get an Organizer" })
  @ApiParam({ name: "id", description: "ID must be set to an organizer's ID" })
  @ApiOkResponse({ type: OrganizerEntity })
  @ApiAuth(Role.TEAM)
  async getOne(@Param("id") id: string) {
    const organizer = await this.organizerRepo.findOne(id).exec();

    return this.organizerService.injectUserRoles([organizer]).pipe(take(1));
  }

  @Patch(":id")
  @ApiOperation({ summary: "Patch an Organizer" })
  @ApiParam({ name: "id", description: "ID must be set to an organizer's ID" })
  @ApiBody({ type: OrganizerUpdateEntity })
  @ApiOkResponse({ type: OrganizerEntity })
  @ApiAuth(Role.EXEC)
  async patchOne(@Param("id") id: string, @Body() data: OrganizerUpdateEntity) {
    const { privilege, ...rest } = data;
    const organizer = await this.organizerRepo.patchOne(id, rest).exec();

    if (data.privilege) {
      await this.auth.updateUserClaims(id, data.privilege);
    }

    this.socket.emit("update:organizer", organizer, SocketRoom.ADMIN);

    return this.organizerService.injectUserRoles([organizer]).pipe(take(1));
  }

  @Put(":id")
  @ApiOperation({ summary: "Replace an Organizer" })
  @ApiParam({ name: "id", description: "ID must be set to an organizer's ID" })
  @ApiBody({ type: OrganizerReplaceEntity })
  @ApiOkResponse({ type: OrganizerEntity })
  @ApiAuth(Role.EXEC)
  async replaceOne(
    @Param("id") id: string,
    @Body() data: OrganizerReplaceEntity,
  ) {
    const { privilege, ...rest } = data;
    const organizer = await this.organizerRepo.replaceOne(id, rest).exec();

    await this.auth.updateUserClaims(id, privilege);
    this.socket.emit("update:organizer", organizer, SocketRoom.ADMIN);

    return this.organizerService.injectUserRoles([organizer]).pipe(take(1));
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete an Organizer" })
  @ApiParam({ name: "id", description: "ID must be set to an organizer's ID" })
  @ApiNoContentResponse()
  @ApiAuth(Role.EXEC)
  async deleteOne(@Param("id") id: string) {
    const organizer = await this.organizerRepo.deleteOne(id).exec();

    await this.auth.updateUserClaims(id, Role.NONE);
    this.socket.emit("delete:organizer", organizer, SocketRoom.ADMIN);

    return organizer;
  }
}
