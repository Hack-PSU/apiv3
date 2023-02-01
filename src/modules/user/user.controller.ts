import {
  Body,
  Controller,
  Delete,
  Get,
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

class CreateEntity extends OmitType(UserEntity, [
  "resume",
  "hackathonId",
] as const) {
  hackathonId?: string;
}

class UpdateEntity extends OmitType(CreateEntity, ["id"] as const) {}

class PatchEntity extends PartialType(UpdateEntity) {}

@Controller("users")
export class UserController {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
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
    @Body("data") data: CreateEntity,
    @UploadedResume() resume?: Express.Multer.File,
  ) {
    let user = await this.userRepo
      .createOne(data)
      .byHackathon(data.hackathonId);

    if (resume) {
      const resumeUrl = await this.userService.uploadResume(
        user.hackathonId,
        user.id,
        resume,
      );

      user = await this.userRepo
        .patchOne(user.id, { resume: resumeUrl })
        .exec();
    }

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
  @UseInterceptors(FileInterceptor("resume"))
  async patchOne(
    @Param("id") id: string,
    @Body("data") data: PatchEntity,
    @UploadedResume() resume?: Express.Multer.File,
  ) {
    const currentUser = await this.userRepo.findOne(id).exec();
    let resumeUrl = null;

    if (resume) {
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
    @Body("data") data: UpdateEntity,
    @UploadedResume() resume?: Express.Multer.File,
  ) {
    const currentUser = await this.userRepo.findOne(id).exec();
    let resumeUrl = null;

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
        ...(resumeUrl ? { resume: resumeUrl } : {}),
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
}
