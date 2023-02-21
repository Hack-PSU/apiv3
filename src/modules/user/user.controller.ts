import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  UseInterceptors,
  ValidationPipe,
} from "@nestjs/common";
import { InjectRepository, Repository } from "common/objection";
import { User, UserEntity } from "entities/user.entity";
import {
  ApiBody,
  ApiExtraModels,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProperty,
  ApiTags,
  OmitType,
  PartialType,
} from "@nestjs/swagger";
import { SocketGateway } from "modules/socket/socket.gateway";
import { RestrictedRoles, Role, Roles } from "common/gcp";
import { FileInterceptor } from "@nestjs/platform-express";
import { UserService } from "modules/user/user.service";
import { UploadedResume } from "modules/user/uploaded-resume.decorator";
import { Express } from "express";
import { Scan, ScanEntity } from "entities/scan.entity";
import {
  ExtraCreditClass,
  ExtraCreditClassEntity,
} from "entities/extra-credit-class.entity";
import {
  ExtraCreditAssignment,
  ExtraCreditAssignmentEntity,
} from "entities/extra-credit-assignment.entity";
import { Hackathon } from "entities/hackathon.entity";
import { ApiAuth } from "common/docs/api-auth";

class UserCreateEntity extends OmitType(UserEntity, ["resume"] as const) {
  @ApiProperty({
    type: "string",
    format: "binary",
    required: false,
    nullable: true,
  })
  resume: any;
}

class UserUpdateEntity extends OmitType(UserCreateEntity, ["id"] as const) {}

class UserPatchEntity extends PartialType(UserUpdateEntity) {}

class CreateUserScanEntity extends OmitType(ScanEntity, [
  "id",
  "hackathonId",
  "userId",
  "eventId",
] as const) {
  hackathonId?: string;
}

@ApiTags("Users")
@Controller("users")
@ApiExtraModels(CreateUserScanEntity)
export class UserController {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Scan)
    private readonly scanRepo: Repository<Scan>,
    @InjectRepository(ExtraCreditClass)
    private readonly ecClassRepo: Repository<ExtraCreditClass>,
    @InjectRepository(ExtraCreditAssignment)
    private readonly ecAssignmentRepo: Repository<ExtraCreditAssignment>,
    private readonly socket: SocketGateway,
    private readonly userService: UserService,
  ) {}

  @Get("/")
  @Roles(Role.TEAM)
  @ApiOperation({ summary: "Get All Users" })
  @ApiOkResponse({ type: [UserEntity] })
  @ApiAuth(Role.TEAM)
  async getAll() {
    return this.userRepo.findAll().byHackathon();
  }

  @Post("/")
  @Roles(Role.NONE)
  @UseInterceptors(FileInterceptor("resume"))
  @ApiOperation({ summary: "Create a User" })
  @ApiBody({ type: UserCreateEntity })
  @ApiOkResponse({ type: UserEntity })
  @ApiAuth(Role.NONE)
  async createOne(
    @Body(new ValidationPipe({ transform: true, forbidUnknownValues: false }))
    data: UserCreateEntity,
    @UploadedResume() resume?: Express.Multer.File,
  ) {
    let resumeUrl = null;

    if (resume) {
      const currentHackathon = await Hackathon.query().findOne({
        active: true,
      });

      resumeUrl = await this.userService.uploadResume(
        data.hackathonId ?? currentHackathon.id,
        data.id,
        resume,
      );
    }

    const user = await this.userRepo
      .createOne({
        ...data,
        resume: resumeUrl,
      })
      .byHackathon();

    this.socket.emit("create:user", user);

    return user;
  }

  @Get(":id")
  @RestrictedRoles({
    roles: [Role.NONE, Role.VOLUNTEER],
    predicate: (req) => req.user && req.user?.sub === req.params.id,
  })
  @Roles(Role.TEAM)
  @ApiOperation({ summary: "Get a User" })
  @ApiOkResponse({ type: UserEntity })
  @ApiAuth(Role.NONE)
  async getOne(@Param("id") id: string) {
    return this.userRepo.findOne(id).byHackathon();
  }

  @Patch(":id")
  @RestrictedRoles({
    roles: [Role.NONE, Role.VOLUNTEER],
    predicate: (req) => req.user && req.user.sub === req.params.id,
  })
  @Roles(Role.NONE)
  @UseInterceptors(FileInterceptor("resume"))
  @ApiOperation({ summary: "Patch a User" })
  @ApiParam({ name: "id", description: "ID must be set to a user's ID" })
  @ApiBody({ type: UserPatchEntity })
  @ApiOkResponse({ type: UserEntity })
  @ApiAuth(Role.NONE)
  async patchOne(
    @Param("id") id: string,
    @Body(new ValidationPipe({ transform: true, forbidUnknownValues: false }))
    data: UserPatchEntity,
    @UploadedResume() resume?: Express.Multer.File,
  ) {
    const currentUser = await this.userRepo.findOne(id).exec();
    let resumeUrl = null;

    if (resume) {
      // remove current resume
      await this.userService.deleteResume(currentUser.hackathonId, id);

      resumeUrl = await this.userService.uploadResume(
        currentUser.hackathonId,
        id,
        resume,
      );
    }

    const user = await this.userRepo
      .patchOne(id, {
        ...data,
        ...(resumeUrl ? { resume: resumeUrl } : {}),
      })
      .exec();

    this.socket.emit("update:user", user);

    return user;
  }

  @Put(":id")
  @RestrictedRoles({
    roles: [Role.NONE, Role.VOLUNTEER],
    predicate: (req) => req.user && req.user.sub === req.params.id,
  })
  @Roles(Role.NONE)
  @UseInterceptors(FileInterceptor("resume"))
  @ApiOperation({ summary: "Replace a User" })
  @ApiParam({ name: "id", description: "ID must be set to a user's ID" })
  @ApiBody({ type: UserUpdateEntity })
  @ApiOkResponse({ type: UserEntity })
  @ApiAuth(Role.NONE)
  async replaceOne(
    @Param("id") id: string,
    @Body(new ValidationPipe({ transform: true, forbidUnknownValues: false }))
    data: UserUpdateEntity,
    @UploadedResume() resume?: Express.Multer.File,
  ) {
    const currentUser = await this.userRepo.findOne(id).exec();
    let resumeUrl = null;

    await this.userService.deleteResume(currentUser.hackathonId, id);

    if (resume) {
      resumeUrl = await this.userService.uploadResume(
        currentUser.hackathonId,
        id,
        resume,
      );
    }

    const user = await this.userRepo
      .replaceOne(id, {
        ...data,
        resume: resumeUrl,
      })
      .exec();

    this.socket.emit("update:user", user);

    return user;
  }

  @Delete(":id")
  @RestrictedRoles({
    roles: [Role.NONE, Role.VOLUNTEER],
    predicate: (req) => req.user && req.user.sub === req.params.id,
  })
  @Roles(Role.NONE)
  @ApiOperation({ summary: "Delete a User" })
  @ApiParam({ name: "id", description: "ID must be set to a user's ID" })
  @ApiNoContentResponse()
  @ApiAuth(Role.NONE)
  async deleteOne(@Param("id") id: string) {
    const user = await this.userRepo.findOne(id).exec();

    const deletedUser = await this.userRepo.deleteOne(id).exec();
    await this.userService.deleteResume(user.hackathonId, user.id);

    this.socket.emit("update:user", user.id);

    return deletedUser;
  }

  @Post(":id/check-in/event/:eventId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(Role.TEAM)
  @ApiOperation({ summary: "Check User Into Event" })
  @ApiParam({ name: "id", description: "ID must be set to a user's ID" })
  @ApiParam({ name: "eventId", description: "ID must be set to an event's ID" })
  @ApiBody({ type: CreateUserScanEntity })
  @ApiNoContentResponse()
  @ApiAuth(Role.TEAM)
  async checkIn(
    @Param("id") id: string,
    @Param("eventId") eventId: string,
    @Body() data: CreateUserScanEntity,
  ) {
    const hasUser = await this.userRepo.findOne(id).exec();

    if (!hasUser) {
      throw new HttpException("user not found", HttpStatus.BAD_REQUEST);
    }

    const { hackathonId, ...rest } = data;

    await this.scanRepo
      .createOne({
        ...rest,
        userId: id,
        eventId,
      })
      .byHackathon(hackathonId);
  }

  @Get(":id/extra-credit/classes")
  @RestrictedRoles({
    roles: [Role.NONE, Role.VOLUNTEER],
    predicate: (req) => req.user && req.user.sub === req.params.id,
  })
  @Roles(Role.TEAM)
  @ApiOperation({ summary: "Get All Extra Credit Classes By User" })
  @ApiParam({ name: "id", description: "ID must be set to a user's ID" })
  @ApiOkResponse({ type: [ExtraCreditClassEntity] })
  @ApiAuth(Role.NONE)
  async classesByUser(@Param("id") id: string) {
    return User.relatedQuery("extraCreditClasses").for(id);
  }

  @Post(":id/extra-credit/assign/:classId")
  @RestrictedRoles({
    roles: [Role.NONE, Role.VOLUNTEER],
    predicate: (req) => req.user && req.user.sub === req.params.id,
  })
  @Roles(Role.TEAM)
  @ApiOperation({ summary: "Assign Extra Credit Class to User" })
  @ApiParam({ name: "id", description: "ID must be set to a user's ID" })
  @ApiParam({ name: "classId", description: "ID must be set to an event's ID" })
  @ApiOkResponse({ type: ExtraCreditAssignmentEntity })
  @ApiAuth(Role.NONE)
  async assignClassToUser(
    @Param("id") id: string,
    @Param("classId", ParseIntPipe) classId: number,
  ) {
    const hasUser = await this.userRepo.findOne(id).exec();
    const hasClass = await this.ecClassRepo.findOne(classId).exec();

    if (!hasUser) {
      throw new HttpException("user not found", HttpStatus.BAD_REQUEST);
    }

    if (!hasClass) {
      throw new HttpException("class not found", HttpStatus.BAD_REQUEST);
    }

    return this.ecAssignmentRepo
      .createOne({ userId: id, classId })
      .byHackathon();
  }
}
