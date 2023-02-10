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
  UseInterceptors,
} from "@nestjs/common";
import { InjectRepository, Repository } from "common/objection";
import { User, UserEntity } from "entities/user.entity";
import { OmitType, PartialType } from "@nestjs/swagger";
import { SocketGateway } from "modules/socket/socket.gateway";
import { RestrictedRoles, Role } from "common/gcp";
import { FileInterceptor } from "@nestjs/platform-express";
import { UserService } from "modules/user/user.service";
import { UploadedResume } from "modules/user/uploaded-resume.decorator";
import { Express } from "express";
import { Scan, ScanEntity } from "entities/scan.entity";
import { ExtraCreditClass } from "entities/extra-credit-class.entity";
import { ExtraCreditAssignment } from "entities/extra-credit-assignment.entity";
import { Hackathon } from "entities/hackathon.entity";

class CreateEntity extends OmitType(UserEntity, [
  "resume",
  "hackathonId",
] as const) {
  hackathonId?: string;
}

class UpdateEntity extends OmitType(CreateEntity, ["id"] as const) {}

class PatchEntity extends PartialType(UpdateEntity) {}

class CreateScanEntity extends OmitType(ScanEntity, [
  "id",
  "hackathonId",
  "userId",
  "eventId",
] as const) {
  hackathonId?: string;
}

@Controller("users")
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
  async getAll() {
    return this.userRepo.findAll().byHackathon();
  }

  @Post("/")
  @UseInterceptors(FileInterceptor("resume"))
  async createOne(
    @Body() data: CreateEntity,
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
    handler: (req) => req.params.id,
  })
  async getOne(@Param("id") id: string) {
    return this.userRepo.findOne(id).byHackathon();
  }

  @Patch(":id")
  @UseInterceptors(FileInterceptor("resume"))
  async patchOne(
    @Param("id") id: string,
    @Body() data: PatchEntity,
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
  @UseInterceptors(FileInterceptor("resume"))
  async replaceOne(
    @Param("id") id: string,
    @Body() data: UpdateEntity,
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
  async deleteOne(@Param("id") id: string) {
    const user = await this.userRepo.findOne(id).exec();

    const deletedUser = await this.userRepo.deleteOne(id).exec();
    await this.userService.deleteResume(user.hackathonId, user.id);

    this.socket.emit("update:user", user.id);

    return deletedUser;
  }

  @Post(":id/check-in/event/:eventId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async checkIn(
    @Param("id") id: string,
    @Param("eventId") eventId: string,
    @Body() data: CreateScanEntity,
  ) {
    const hasUser = await this.userRepo.findOne(id).exec();

    if (!hasUser) {
      throw new HttpException("user not found", HttpStatus.BAD_REQUEST);
    }

    const { hackathonId, ...rest } = data;

    await this.scanRepo.createOne(rest).byHackathon(hackathonId);
  }

  @Get(":id/extra-credit/classes")
  async classesByUser(@Param("id") id: string) {
    return User.relatedQuery("extraCreditClasses").for(id);
  }

  @Post(":id/extra-credit/assign/:classId")
  async assignClassToUser(
    @Param("id") id: string,
    @Param("classId") classId: number,
  ) {
    const hasUser = await this.userRepo.findOne(id).exec();
    const hasClass = await this.ecClassRepo.findOne(classId).exec();

    if (!hasUser) {
      throw new HttpException("user not found", HttpStatus.BAD_REQUEST);
    }

    if (!hasClass) {
      throw new HttpException("class not found", HttpStatus.BAD_REQUEST);
    }

    return this.ecAssignmentRepo.createOne({ userId: id, classId });
  }
}
