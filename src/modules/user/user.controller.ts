import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  StreamableFile,
  UnauthorizedException,
  UseFilters,
  UseInterceptors,
  ValidationPipe,
} from "@nestjs/common";
import { InjectRepository, Repository } from "common/objection";
import { User, UserEntity } from "entities/user.entity";
import {
  ApiExtraModels,
  ApiProperty,
  ApiTags,
  OmitType,
  PartialType,
} from "@nestjs/swagger";
import { SocketGateway } from "modules/socket/socket.gateway";
import { FirebaseAuthService, RestrictedRoles, Role, Roles } from "common/gcp";
import { FileInterceptor } from "@nestjs/platform-express";
import { UserService } from "modules/user/user.service";
import { UploadedResume } from "modules/user/uploaded-resume.decorator";
import { Express, Request } from "express";
import { Scan, ScanEntity } from "entities/scan.entity";
import {
  ExtraCreditClass,
  ExtraCreditClassEntity,
} from "entities/extra-credit-class.entity";
import {
  ExtraCreditAssignment,
  ExtraCreditAssignmentEntity,
} from "entities/extra-credit-assignment.entity";
import { ApiDoc, BadRequestExceptionResponse } from "common/docs";
import { DBExceptionFilter } from "common/filters";
import {
  DefaultFromEmail,
  DefaultTemplate,
  SendGridService,
} from "common/sendgrid";
import { Registration, RegistrationEntity } from "entities/registration.entity";
import * as admin from "firebase-admin";
import { IsOptional } from "class-validator";
import { Transform } from "class-transformer";
import { FirebaseMessagingService } from "common/gcp/messaging";
import { Event } from "entities/event.entity";

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
  "userId",
  "eventId",
] as const) {}

class CreateUserRegistrationEntity extends OmitType(RegistrationEntity, [
  "id",
  "userId",
  "hackathonId",
] as const) {}

class UserProfileResponse extends UserEntity {
  @ApiProperty({
    type: RegistrationEntity,
    description: "Current hackathon's registration",
    nullable: true,
  })
  registration: RegistrationEntity;
}

class ActiveUsersParams {
  @ApiProperty({
    required: false,
    description: "active can either be a boolean or undefined",
  })
  @IsOptional()
  @Transform(({ value }) => {
    switch (value) {
      case "true":
        return true;
      case "false":
        return false;
      default:
        return undefined;
    }
  })
  active?: boolean;
}

@ApiTags("Users")
@Controller("users")
@UseFilters(DBExceptionFilter)
@ApiExtraModels(CreateUserScanEntity, UserProfileResponse)
export class UserController {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
    @InjectRepository(Scan)
    private readonly scanRepo: Repository<Scan>,
    @InjectRepository(ExtraCreditClass)
    private readonly ecClassRepo: Repository<ExtraCreditClass>,
    @InjectRepository(ExtraCreditAssignment)
    private readonly ecAssignmentRepo: Repository<ExtraCreditAssignment>,
    @InjectRepository(Registration)
    private readonly registrationRepo: Repository<Registration>,
    private readonly socket: SocketGateway,
    private readonly userService: UserService,
    private readonly sendGridService: SendGridService,
    private readonly auth: FirebaseAuthService,
    private readonly fcmService: FirebaseMessagingService,
  ) {}

  @Get("/")
  @Roles(Role.TEAM)
  @ApiDoc({
    summary: "Get All Users",
    query: [
      {
        name: "active",
        type: ActiveUsersParams,
      },
    ],
    response: {
      ok: { type: [UserEntity] },
    },
    auth: Role.TEAM,
  })
  async getAll(
    @Query(new ValidationPipe({ transform: true }))
    { active }: ActiveUsersParams,
  ) {
    if (active === undefined || active === false) {
      return this.userRepo.findAll().exec();
    } else if (active === true) {
      return this.userRepo.findAll().byHackathon();
    }
  }

  @Post("/")
  @Roles(Role.NONE)
  @UseInterceptors(FileInterceptor("resume"))
  @ApiDoc({
    summary: "Create a User",
    request: {
      mimeTypes: ["multipart/form-data"],
      body: { type: UserCreateEntity },
      validate: true,
    },
    response: {
      created: { type: UserEntity },
    },
    restricted: true,
    auth: Role.NONE,
  })
  async createOne(
    @Body(
      new ValidationPipe({
        forbidNonWhitelisted: true,
        whitelist: true,
        transform: true,
      }),
    )
    data: UserCreateEntity,
    @UploadedResume() resume?: Express.Multer.File,
  ) {
    let resumeUrl = null;

    try {
      if (resume) {
        resumeUrl = await this.userService.uploadResume(data.id, resume);
      }

      const user = await this.userRepo
        .createOne({ ...data, resume: resumeUrl })
        .exec();

      await this.auth.updateUserPrivilege(data.id, Role.NONE);

      this.socket.emit("create:user", user);

      return user;
    } catch (error) {
      console.log(`user create: ${data.id}: ${error}`);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get("resumes")
  @Roles(Role.EXEC)
  @Header("Content-Type", "application/zip")
  @ApiDoc({
    summary: "Get All Resumes",
    response: {
      ok: { type: StreamableFile },
    },
    auth: Role.EXEC,
  })
  async getAllResumes(): Promise<StreamableFile> {
    try {
      const zip = await this.userService.downloadAllResumes();
      return new StreamableFile(zip);
    } catch (error) {
      console.log(`getAllResumes: ${error}`);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get("info/me")
  @Roles(Role.NONE)
  @ApiDoc({
    summary: "Get User Profile",
    auth: Role.NONE,
    response: {
      ok: { type: UserProfileResponse },
    },
  })
  async getMyInfo(@Req() req: Request) {
    if (!req.user || !("sub" in req.user)) {
      throw new UnauthorizedException();
    }

    const userId = String(req.user.sub);

    try {
      const user = await this.userRepo
        .findOne(userId)
        .raw()
        .withGraphFetched("registrations(active)");

      if (user) {
        const { registrations, ...data } = user;

        return {
          ...data,
          registration: registrations[0] ?? null,
        };
      } else {
        return {};
      }
    } catch (error) {
      console.log(`profile: ${userId}: ${error}`);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(":id")
  @RestrictedRoles({
    roles: [Role.NONE, Role.VOLUNTEER],
    predicate: (req) => req.user && req.user?.sub === req.params.id,
  })
  @Roles(Role.TEAM)
  @ApiDoc({
    summary: "Get a User",
    params: [
      {
        name: "id",
        description: "ID must be set to a user's ID",
      },
    ],
    response: {
      ok: { type: UserEntity },
    },
    auth: Role.NONE,
    restricted: true,
  })
  async getOne(@Param("id") id: string) {
    return this.userRepo.findOne(id).exec();
  }

  @Patch(":id")
  @RestrictedRoles({
    roles: [Role.NONE, Role.VOLUNTEER],
    predicate: (req) => req.user && req.user.sub === req.params.id,
  })
  @Roles(Role.TEAM)
  @UseInterceptors(FileInterceptor("resume"))
  @ApiDoc({
    summary: "Patch a User",
    params: [
      {
        name: "id",
        description: "ID must be set to a user's ID",
      },
    ],
    request: {
      mimeTypes: ["multipart/form-data"],
      body: { type: UserPatchEntity },
      validate: true,
    },
    response: {
      ok: { type: UserEntity },
    },
    auth: Role.NONE,
    restricted: true,
  })
  async patchOne(
    @Param("id") id: string,
    @Body(
      new ValidationPipe({
        forbidNonWhitelisted: true,
        whitelist: true,
        transform: true,
      }),
    )
    data: UserPatchEntity,
    @UploadedResume() resume?: Express.Multer.File,
  ) {
    let resumeUrl = null;

    if (resume) {
      // remove current resume
      await this.userService.deleteResume(id);
      resumeUrl = await this.userService.uploadResume(id, resume);
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
  @Roles(Role.TEAM)
  @UseInterceptors(FileInterceptor("resume"))
  @ApiDoc({
    summary: "Replace a User",
    params: [
      {
        name: "id",
        description: "ID must be set to a user's ID ",
      },
    ],
    request: {
      mimeTypes: ["multipart/form-data"],
      body: { type: UserUpdateEntity },
      validate: true,
    },
    response: {
      ok: { type: UserEntity },
    },
    auth: Role.NONE,
    restricted: true,
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
    data: UserUpdateEntity,
    @UploadedResume() resume?: Express.Multer.File,
  ) {
    try {
      // Delete pre-existing resume regardless of whether a new one is given.
      // (So that we don't accidentally give an outdated one to sponsors.)
      await this.userService.deleteResume(id);

      let resumeUrl = null;
      if (resume) {
        resumeUrl = await this.userService.uploadResume(id, resume);
      }

      // If a user already exists, replace their information. Otherwise, create a new one.
      const preExistingUser = await this.userRepo.findOne(id).exec();
      let user = null;
      if (preExistingUser) {
        user = await this.userRepo
          .replaceOne(id, { ...data, resume: resumeUrl })
          .exec();
        this.socket.emit("update:user", user);
      } else {
        user = await this.userRepo
          .createOne({ ...data, id: id, resume: resumeUrl })
          .exec();
        this.auth.updateUserPrivilege(id, Role.NONE);
        this.socket.emit("create:user", user);
      }

      if (!user) {
        throw new HttpException(
          "Failed to PUT user.",
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      return user;
    } catch (error) {
      console.log(`user PUT: ${id}: ${error}`);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete(":id")
  @RestrictedRoles({
    roles: [Role.NONE, Role.VOLUNTEER],
    predicate: (req) => req.user && req.user.sub === req.params.id,
  })
  @Roles(Role.EXEC)
  @ApiDoc({
    summary: "Delete a User",
    params: [
      {
        name: "id",
        description: "ID must be set to a user's ID",
      },
    ],
    response: {
      noContent: true,
    },
    auth: Role.NONE,
    restricted: true,
  })
  async deleteOne(@Param("id") id: string) {
    const deletedUser = await this.userRepo.deleteOne(id).exec();
    await this.userService.deleteResume(id);
    await admin.auth().deleteUser(id);

    this.socket.emit("update:user", id);

    return deletedUser;
  }

  @Post(":id/register")
  @Roles(Role.TEAM)
  @RestrictedRoles({
    roles: [Role.NONE],
    predicate: (req) => req.user && req.user.sub === req.params.id,
  })
  @ApiDoc({
    summary: "Register User for Hackathon",
    params: [
      {
        name: "id",
        description: "ID must be set to a user's ID",
      },
    ],
    request: {
      body: { type: CreateUserRegistrationEntity },
      validate: true,
    },
    response: {
      created: { type: RegistrationEntity },
    },
    auth: Role.NONE,
    restricted: true,
    dbException: true,
  })
  async registerUser(
    @Param("id") id: string,
    @Body(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    )
    data: CreateUserRegistrationEntity,
  ) {
    let user;
    try {
      user = await this.userRepo.findOne(id).exec();
    } catch (error) {
      console.log(`register find user: ${id}: ${error}`);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (!user) {
      throw new HttpException("No user found", HttpStatus.BAD_REQUEST);
    }

    let hasRegistration;
    try {
      hasRegistration = await this.registrationRepo
        .findAll()
        .byHackathon()
        .where("userId", id)
        .first();
    } catch (error) {
      console.log(`register find registration: ${id}: ${error}`);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (hasRegistration) {
      throw new HttpException("Duplicate registration", HttpStatus.CONFLICT);
    }

    let newRegistration;
    try {
      newRegistration = this.registrationRepo
        .createOne({
          userId: id,
          ...data,
        })
        .byHackathon();
    } catch (error) {
      console.log(`register create registration: ${id}: ${error}`);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    // If we need to test emails locally, then comment out this statement.
    // However, we don't really want to spam ourselves if we don't have to.
    if (
      process.env.RUNTIME_INSTANCE &&
      process.env.RUNTIME_INSTANCE === "production"
    ) {
      const message = await this.sendGridService.populateTemplate(
        DefaultTemplate.registration,
        {
          previewText: "HackPSU Spring 2024 Registration",
          date: "March 16th-17th",
          address: "Business Building, University Park PA",
          firstName: user.firstName,
        },
      );

      await this.sendGridService.send({
        from: DefaultFromEmail,
        to: user.email,
        subject: "Thank you for your Registration",
        message,
      });
    }

    return newRegistration;
  }

  @Get(":id/resumes")
  @Roles(Role.EXEC)
  @RestrictedRoles({
    roles: [Role.NONE],
    predicate: (req) => req.user && req.user.sub === req.params.id,
  })
  @Header("Content-Type", "application/pdf")
  @ApiDoc({
    summary: "Get User Resume",
    params: [
      {
        name: "id",
        description: "ID must be set to a user's ID",
      },
    ],
    response: {
      ok: { type: StreamableFile },
    },
    auth: Role.EXEC,
  })
  async getResume(@Param(":id") id: string): Promise<StreamableFile> {
    try {
      const user = await this.userRepo.findOne(id).exec();
      if (!user) {
        throw new HttpException("User not found", HttpStatus.NOT_FOUND);
      }
      if (!user.resume) {
        throw new HttpException("User has no resume", HttpStatus.NO_CONTENT);
      }
      const resume = await this.userService.downloadResume(id);
      return new StreamableFile(resume);
    } catch (error) {
      console.log(`getResume: ${id}: ${error}`);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post(":id/check-in/event/:eventId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(Role.TEAM)
  @ApiDoc({
    summary: "Check User Into Event",
    params: [
      {
        name: "id",
        description: "ID must be set to a user's ID",
      },
      {
        name: "eventId",
        description: "ID must be set to an event's ID",
      },
    ],
    request: {
      body: { type: CreateUserScanEntity },
      validate: true,
    },
    response: {
      noContent: true,
    },
    dbException: true,
    auth: Role.TEAM,
  })
  async checkIn(
    @Param("id") id: string,
    @Param("eventId") eventId: string,
    @Body(
      new ValidationPipe({
        forbidNonWhitelisted: true,
        whitelist: true,
        transform: true,
      }),
    )
    data: CreateUserScanEntity,
  ) {
    const hasUser = await this.userRepo.findOne(id).exec();
    const event = await this.eventRepo.findOne(eventId).exec();

    if (!hasUser) {
      throw new HttpException("user not found", HttpStatus.BAD_REQUEST);
    }

    if (!event) {
      throw new HttpException("event not found", HttpStatus.BAD_REQUEST);
    }

    const { hackathonId, ...rest } = data;

    await this.scanRepo
      .createOne({
        ...rest,
        userId: id,
        eventId,
      })
      .byHackathon(hackathonId);

    try {
      await this.fcmService.sendTokenMessage(hasUser.id, {
        title: "Check-In",
        body: `You have just checked-in to ${event.name}`,
      });
    } catch (e) {
      console.error(
        `User_Controller: Cannot send token message to ${hasUser.id}`,
        e,
      );
    }
  }

  @Get(":id/extra-credit/classes")
  @RestrictedRoles({
    roles: [Role.NONE, Role.VOLUNTEER],
    predicate: (req) => req.user && req.user.sub === req.params.id,
  })
  @Roles(Role.TEAM)
  @ApiDoc({
    summary: "Get All Extra Credit Classes By User",
    params: [
      {
        name: "id",
        description: "ID must be set to a user's ID",
      },
    ],
    response: {
      ok: { type: [ExtraCreditClassEntity] },
    },
    auth: Role.NONE,
    restricted: true,
  })
  async classesByUser(@Param("id") id: string) {
    return User.relatedQuery("extraCreditClasses").for(id);
  }

  @Post(":id/extra-credit/assign/:classId")
  @RestrictedRoles({
    roles: [Role.NONE, Role.VOLUNTEER],
    predicate: (req) => req.user && req.user.sub === req.params.id,
  })
  @Roles(Role.TEAM)
  @ApiDoc({
    summary: "Assign Extra Credit Class to User",
    params: [
      {
        name: "id",
        description: "ID must be set to a user's ID",
      },
      {
        name: "classId",
        description: "ID must be set to a class's ID",
      },
    ],
    response: {
      ok: { type: ExtraCreditAssignmentEntity },
    },
    auth: Role.NONE,
    restricted: true,
    dbException: true,
  })
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

    return this.ecAssignmentRepo.createOne({ userId: id, classId }).exec();
  }

  @Post(":id/extra-credit/unassign/:classId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @RestrictedRoles({
    roles: [Role.NONE, Role.VOLUNTEER],
    predicate: (req) => req.user && req.user.sub === req.params.id,
  })
  @Roles(Role.TEAM)
  @ApiDoc({
    summary: "Unassign Extra Credit Class to User",
    params: [
      {
        name: "id",
        description: "ID must be set to a user's ID",
      },
      {
        name: "classId",
        description: "ID must be set to a class's ID",
      },
    ],
    response: {
      noContent: true,
      custom: [
        {
          status: HttpStatus.BAD_REQUEST,
          type: BadRequestExceptionResponse,
        },
      ],
    },
    auth: Role.NONE,
    restricted: true,
    dbException: true,
  })
  async unassignUserFromClass(
    @Param("id") id: string,
    @Param("classId", ParseIntPipe) classId: number,
  ) {
    return this.ecAssignmentRepo.deleteOne([id, classId]).exec();
  }
}
