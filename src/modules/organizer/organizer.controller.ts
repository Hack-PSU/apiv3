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
  UseFilters,
  ValidationPipe,
} from "@nestjs/common";
import { InjectRepository, Repository } from "common/objection";
import { Organizer, OrganizerEntity } from "entities/organizer.entity";
import { SocketGateway } from "modules/socket/socket.gateway";
import { ApiTags, OmitType, PartialType } from "@nestjs/swagger";
import { FirebaseAuthService, RestrictedRoles, Role, Roles } from "common/gcp";
import { take, toArray } from "rxjs";
import { OrganizerService } from "modules/organizer/organizer.service";
import { SocketRoom } from "common/socket";
import { ControllerMethod } from "common/validation";
import { ApiDoc } from "common/docs";
import { DBExceptionFilter } from "common/filters";

class OrganizerCreateEntity extends OrganizerEntity {}

class OrganizerReplaceEntity extends OmitType(OrganizerCreateEntity, [
  "id",
] as const) {}

class OrganizerUpdateEntity extends PartialType(OrganizerReplaceEntity) {}

@ApiTags("Organizers")
@Controller("organizers")
@UseFilters(DBExceptionFilter)
export class OrganizerController {
  constructor(
    @InjectRepository(Organizer)
    private readonly organizerRepo: Repository<Organizer>,
    private readonly socket: SocketGateway,
    private readonly auth: FirebaseAuthService,
    private readonly organizerService: OrganizerService,
  ) {}

  @Get("/")
  @Roles(Role.EXEC)
  @ApiDoc({
    summary: "Get All Organizers",
    response: {
      ok: { type: OrganizerEntity },
    },
    auth: Role.EXEC,
  })
  async getAll() {
    const organizers = await this.organizerRepo.findAll().exec();

    return this.organizerService.injectUserRoles(organizers).pipe(toArray());
  }

  @Post("/")
  @Roles(Role.EXEC)
  @ApiDoc({
    summary: "Create an Organizer",
    request: {
      body: { type: OrganizerCreateEntity },
      validate: true,
    },
    response: {
      created: { type: OrganizerEntity },
    },
    auth: Role.EXEC,
  })
  async createOne(
    @Body(
      new ValidationPipe({
        forbidNonWhitelisted: true,
        whitelist: true,
        transform: true,
        transformOptions: {
          groups: [ControllerMethod.POST],
        },
      }),
    )
    data: OrganizerCreateEntity,
  ) {
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
  @RestrictedRoles({
    roles: [Role.TEAM],
    predicate: (req) => req.user && req.user.sub === req.params.id,
  })
  @Roles(Role.EXEC)
  @ApiDoc({
    summary: "Get an Organizer",
    auth: Role.TEAM,
    restricted: true,
    params: [
      { name: "id", description: "ID must be set to an organizer's ID" },
    ],
    response: {
      ok: { type: OrganizerEntity },
    },
  })
  async getOne(@Param("id") id: string) {
    const organizer = await this.organizerRepo.findOne(id).exec();

    return this.organizerService.injectUserRoles([organizer]).pipe(take(1));
  }

  @Patch(":id")
  @Roles(Role.EXEC)
  @ApiDoc({
    summary: "Patch an Organizer",
    params: [
      {
        name: "id",
        description: "ID must be set to an organizer's ID",
      },
    ],
    request: {
      body: { type: OrganizerUpdateEntity },
      validate: true,
    },
    response: {
      ok: { type: OrganizerEntity },
    },
    auth: Role.EXEC,
  })
  async patchOne(
    @Param("id") id: string,
    @Body(
      new ValidationPipe({
        forbidNonWhitelisted: true,
        whitelist: true,
        transform: true,
        transformOptions: {
          exposeUnsetFields: false,
        },
      }),
    )
    data: OrganizerUpdateEntity,
  ) {
    const { privilege, ...rest } = data;
    const organizer = await this.organizerRepo.patchOne(id, rest).exec();

    if (data.privilege) {
      await this.auth.updateUserClaims(id, data.privilege);
    }

    this.socket.emit("update:organizer", organizer, SocketRoom.ADMIN);

    return this.organizerService.injectUserRoles([organizer]).pipe(take(1));
  }

  @Put(":id")
  @Roles(Role.EXEC)
  @ApiDoc({
    summary: "Replace an Organizer",
    params: [
      {
        name: "id",
        description: "ID must be set to an organizer's ID",
      },
    ],
    request: {
      body: { type: OrganizerReplaceEntity },
      validate: true,
    },
    response: {
      ok: { type: OrganizerEntity },
    },
    auth: Role.EXEC,
  })
  async replaceOne(
    @Param("id") id: string,
    @Body(
      new ValidationPipe({
        forbidNonWhitelisted: true,
        whitelist: true,
        transform: true,
      }),
    )
    data: OrganizerReplaceEntity,
  ) {
    const { privilege, ...rest } = data;
    const organizer = await this.organizerRepo.replaceOne(id, rest).exec();

    await this.auth.updateUserClaims(id, privilege);
    this.socket.emit("update:organizer", organizer, SocketRoom.ADMIN);

    return this.organizerService.injectUserRoles([organizer]).pipe(take(1));
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(Role.EXEC)
  @ApiDoc({
    summary: "Delete an Organizer",
    params: [
      {
        name: "id",
        description: "ID must be set to an organizer's ID",
      },
    ],
    response: {
      noContent: true,
    },
    auth: Role.EXEC,
  })
  async deleteOne(@Param("id") id: string) {
    const organizer = await this.organizerRepo.deleteOne(id).exec();

    await this.auth.updateUserClaims(id, Role.NONE);
    this.socket.emit("delete:organizer", organizer, SocketRoom.ADMIN);

    return organizer;
  }
}
