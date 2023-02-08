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
import { Sponsor, SponsorEntity } from "entities/sponsor.entity";
import { SocketGateway } from "modules/socket/socket.gateway";
import { OmitType, PartialType } from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import { UploadedLogo } from "modules/sponsor/uploaded-logo.decorator";
import { Express } from "express";
import { SponsorService } from "modules/sponsor/sponsor.service";
import { SocketRoom } from "common/socket";

class SponsorCreateEntity extends OmitType(SponsorEntity, [
  "id",
  "logo",
] as const) {}

class SponsorPatchEntity extends PartialType(SponsorCreateEntity) {}

class SponsorPatchBatchEntity extends SponsorPatchEntity {
  id: number;
}

@Controller("sponsors")
export class SponsorController {
  constructor(
    @InjectRepository(Sponsor)
    private readonly sponsorRepo: Repository<Sponsor>,
    private readonly socket: SocketGateway,
    private readonly sponsorService: SponsorService,
  ) {}

  @Get("/")
  async getAll() {
    return this.sponsorRepo.findAll().byHackathon();
  }

  @Post("/")
  @UseInterceptors(FileInterceptor("logo"))
  async createOne(
    @Body() data: SponsorCreateEntity,
    @UploadedLogo() logo?: Express.Multer.File,
  ) {
    let sponsor = await this.sponsorRepo.createOne(data).byHackathon();

    if (logo) {
      const logoUrl = await this.sponsorService.uploadLogo(
        {
          id: sponsor.id,
          name: sponsor.name,
        },
        logo,
      );

      sponsor = await this.sponsorRepo
        .patchOne(sponsor.id, { logo: logoUrl })
        .exec();
    }

    this.socket.emit("create:sponsor", sponsor, SocketRoom.MOBILE);

    return sponsor;
  }

  @Get(":id")
  async getOne(@Param("id") id: number) {
    return this.sponsorRepo.findOne(id).exec();
  }

  @Patch(":id")
  @UseInterceptors(FileInterceptor("logo"))
  async patchOne(
    @Param("id") id: number,
    @Body() data: SponsorPatchEntity,
    @UploadedLogo() logo?: Express.Multer.File,
  ) {
    const currentSponsor = await this.sponsorRepo.findOne(id).exec();
    let logoUrl = null;

    if (logo) {
      logoUrl = await this.sponsorService.uploadLogo(
        {
          id,
          name: currentSponsor.name,
        },
        logo,
      );
    }

    const sponsor = await this.sponsorRepo
      .patchOne(id, {
        ...data,
        ...(logoUrl ? { logo: logoUrl } : {}),
      })
      .exec();

    this.socket.emit("update:sponsor", sponsor, SocketRoom.MOBILE);

    return sponsor;
  }

  @Put(":id")
  @UseInterceptors(FileInterceptor("logo"))
  async replaceOne(
    @Param("id") id: number,
    @Body() data: SponsorCreateEntity,
    @UploadedLogo() logo?: Express.Multer.File,
  ) {
    const currentSponsor = await this.sponsorRepo.findOne(id).exec();
    let logoUrl = null;

    if (logo) {
      logoUrl = await this.sponsorService.uploadLogo(
        {
          id,
          name: currentSponsor.name,
        },
        logo,
      );
    }

    // fills hackathonId based on currently active
    const sponsor = await this.sponsorRepo
      .replaceOne(id, { data, logo: logoUrl })
      .byHackathon();

    this.socket.emit("update:sponsor", sponsor, SocketRoom.MOBILE);

    return sponsor;
  }

  @Delete(":id")
  async deleteOne(@Param("id") id: number) {
    const currentSponsor = await this.sponsorRepo.findOne(id).exec();

    await this.sponsorService.deleteLogo({
      id,
      name: currentSponsor.name,
    });

    const sponsor = await this.sponsorRepo.deleteOne(id).exec();

    this.socket.emit("update:sponsor", sponsor, SocketRoom.MOBILE);

    return sponsor;
  }

  @Patch("/batch/update")
  async patchBatch(@Body() data: SponsorPatchBatchEntity[]) {
    const sponsors = await Promise.all(
      data.map(({ id, ...data }) => this.sponsorRepo.patchOne(id, data)),
    );

    this.socket.emit("batch_update:sponsor", sponsors, SocketRoom.MOBILE);

    return sponsors;
  }
}
