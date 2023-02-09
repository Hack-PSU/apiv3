import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  UseInterceptors,
  ValidationPipe,
} from "@nestjs/common";
import { InjectRepository, Repository } from "common/objection";
import { Sponsor, SponsorEntity } from "entities/sponsor.entity";
import { SocketGateway } from "modules/socket/socket.gateway";
import {
  ApiBody,
  ApiConsumes,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProperty,
  ApiTags,
  OmitType,
  PartialType,
} from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import { UploadedLogo } from "modules/sponsor/uploaded-logo.decorator";
import { Express } from "express";
import { SponsorService } from "modules/sponsor/sponsor.service";
import { SocketRoom } from "common/socket";
import { ApiAuth } from "common/docs/api-auth";
import { Role } from "common/gcp";
import * as _ from "lodash";
import { ParseBatchUpdatePipe } from "modules/sponsor/parse-batch-update.pipe";

class SponsorCreateEntity extends OmitType(SponsorEntity, [
  "id",
  "logo",
] as const) {
  @ApiProperty({
    type: "string",
    format: "binary",
    required: false,
    nullable: true,
  })
  logo?: any;
}

class SponsorPatchEntity extends PartialType(SponsorCreateEntity) {}

class SponsorPatchBatchEntity extends OmitType(SponsorPatchEntity, [
  "name",
  "logo",
  "hackathonId",
] as const) {
  id: number;
}

@ApiTags("Sponsorship")
@Controller("sponsors")
export class SponsorController {
  constructor(
    @InjectRepository(Sponsor)
    private readonly sponsorRepo: Repository<Sponsor>,
    private readonly socket: SocketGateway,
    private readonly sponsorService: SponsorService,
  ) {}

  @Get("/")
  @ApiOperation({ summary: "Get All Sponsors" })
  @ApiOkResponse({ type: [SponsorEntity] })
  @ApiAuth(Role.TEAM)
  async getAll() {
    return this.sponsorRepo.findAll().byHackathon();
  }

  @Post("/")
  @UseInterceptors(FileInterceptor("logo"))
  @ApiOperation({ summary: "Create a Sponsor" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({ type: SponsorCreateEntity })
  @ApiOkResponse({ type: SponsorEntity })
  @ApiAuth(Role.TEAM)
  async createOne(
    @Body(new ValidationPipe({ transform: true, forbidUnknownValues: false }))
    data: SponsorCreateEntity,
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
  @ApiOperation({ summary: "Get a Sponsor" })
  @ApiParam({ name: "id", description: "ID must be set to a sponsor's ID" })
  @ApiOkResponse({ type: SponsorEntity })
  @ApiAuth(Role.TEAM)
  async getOne(@Param("id") id: number) {
    return this.sponsorRepo.findOne(id).exec();
  }

  @Patch(":id")
  @UseInterceptors(FileInterceptor("logo"))
  @ApiOperation({ summary: "Patch a Sponsor" })
  @ApiConsumes("multipart/form-data")
  @ApiParam({ name: "id", description: "ID must be set to a sponsor's ID" })
  @ApiBody({ type: SponsorPatchEntity })
  @ApiOkResponse({ type: SponsorEntity })
  @ApiAuth(Role.TEAM)
  async patchOne(
    @Param("id") id: number,
    @Body(new ValidationPipe({ transform: true, forbidUnknownValues: false }))
    data: SponsorPatchEntity,
    @UploadedLogo() logo?: Express.Multer.File,
  ) {
    const currentSponsor = await this.sponsorRepo.findOne(id).exec();
    let logoUrl = null;

    if (logo) {
      await this.sponsorService.deleteLogo({
        id,
        name: currentSponsor.name,
      });

      logoUrl = await this.sponsorService.uploadLogo(
        {
          id,
          name: data.name,
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
  @ApiOperation({ summary: "Replace a Sponsor" })
  @ApiConsumes("multipart/form-data")
  @ApiParam({ name: "id", description: "ID must be set to a sponsor's ID" })
  @ApiBody({ type: SponsorCreateEntity })
  @ApiOkResponse({ type: SponsorEntity })
  @ApiAuth(Role.TEAM)
  async replaceOne(
    @Param("id") id: number,
    @Body(new ValidationPipe({ transform: true, forbidUnknownValues: false }))
    data: SponsorCreateEntity,
    @UploadedLogo() logo?: Express.Multer.File,
  ) {
    const currentSponsor = await this.sponsorRepo.findOne(id).exec();
    let logoUrl = null;

    await this.sponsorService.deleteLogo({
      id,
      name: currentSponsor.name,
    });

    if (logo) {
      // Insert new logo with new name
      logoUrl = await this.sponsorService.uploadLogo(
        {
          id,
          name: data.name,
        },
        logo,
      );
    }

    // fills hackathonId based on currently active
    const sponsor = await this.sponsorRepo
      .replaceOne(id, { ...data, logo: logoUrl })
      .exec();

    this.socket.emit("update:sponsor", sponsor, SocketRoom.MOBILE);

    return sponsor;
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete a Sponsor" })
  @ApiParam({ name: "id", description: "ID must be set to a sponsor's ID" })
  @ApiNoContentResponse()
  @ApiAuth(Role.TEAM)
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
  @ApiOperation({ summary: "Batch Update Sponsors" })
  @ApiBody({ type: [SponsorPatchBatchEntity] })
  @ApiOkResponse({ type: [SponsorEntity] })
  @ApiAuth(Role.TEAM)
  async patchBatch(
    @Body(new ParseBatchUpdatePipe(["name", "logo", "hackathonId"]))
    data: SponsorPatchBatchEntity[],
  ) {
    const sponsors = await Promise.all(
      data.map(({ id, ...data }) => this.sponsorRepo.patchOne(id, data).exec()),
    );

    this.socket.emit("batch_update:sponsor", sponsors, SocketRoom.MOBILE);

    return sponsors;
  }
}
