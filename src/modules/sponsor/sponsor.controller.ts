import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseArrayPipe,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  UploadedFiles,
  UseFilters,
  UseInterceptors,
  ValidationPipe,
} from "@nestjs/common";
import { InjectRepository, Repository } from "common/objection";
import { Sponsor, SponsorEntity } from "entities/sponsor.entity";
import { SocketGateway } from "modules/socket/socket.gateway";
import {
  ApiProperty,
  ApiTags,
  IntersectionType,
  OmitType,
  PartialType,
  PickType,
} from "@nestjs/swagger";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import { Express } from "express";
import { SponsorService } from "modules/sponsor/sponsor.service";
import { SocketRoom } from "common/socket";
import { RestrictedRoles, Role, Roles } from "common/gcp";
import { ApiDoc } from "common/docs";
import { ControllerMethod } from "common/validation";
import { DBExceptionFilter } from "common/filters";

class SponsorCreateEntity extends OmitType(SponsorEntity, [
  "id",
  "lightLogo",
  "darkLogo",
] as const) {
  @ApiProperty({
    type: "string",
    format: "binary",
    required: false,
    nullable: true,
  })
  lightLogo?: any;

  @ApiProperty({
    type: "string",
    format: "binary",
    required: false,
    nullable: true,
  })
  darkLogo?: any;
}

class SponsorPatchEntity extends PartialType(SponsorCreateEntity) {}

class SponsorPatchBatchEntity extends IntersectionType(
  OmitType(SponsorPatchEntity, [
    "name",
    "lightLogo",
    "darkLogo",
    "hackathonId",
  ] as const),
  PickType(SponsorEntity, ["id"] as const),
) {}

type UploadedLogos = {
  darkLogo?: Express.Multer.File;
  lightLogo?: Express.Multer.File;
};

@ApiTags("Sponsorship")
@Controller("sponsors")
@UseFilters(DBExceptionFilter)
export class SponsorController {
  constructor(
    @InjectRepository(Sponsor)
    private readonly sponsorRepo: Repository<Sponsor>,
    private readonly socket: SocketGateway,
    private readonly sponsorService: SponsorService,
  ) {}

  @Get("/")
  @Roles(Role.TEAM)
  @RestrictedRoles({
    roles: [Role.NONE, Role.VOLUNTEER],
    predicate: (req) => req.query.hackathonId === undefined,
  })
  @ApiDoc({
    summary: "Get All Sponsors",
    query: [
      {
        name: "hackathonId",
        description: "The ID of a valid hackathon",
      },
    ],
    response: {
      ok: { type: [SponsorEntity] },
    },
    restricted: true,
    auth: Role.TEAM,
  })
  async getAll(@Query("hackathonId") hackathonId?: string) {
    return this.sponsorRepo.findAll().byHackathon(hackathonId);
  }

  @Post("/")
  @Roles(Role.TEAM)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: "darkLogo", maxCount: 1 },
      { name: "lightLogo", maxCount: 1 },
    ]),
  )
  @ApiDoc({
    summary: "Create a Sponsor",
    request: {
      mimeTypes: ["multipart/form-data"],
      body: { type: SponsorCreateEntity },
    },
    response: {
      created: { type: SponsorEntity },
    },
    auth: Role.TEAM,
  })
  async createOne(
    @Body(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    data: SponsorCreateEntity,
    @UploadedFiles() files: UploadedLogos,
  ) {
    const { darkLogo, lightLogo } = files;

    let sponsor = await this.sponsorRepo
      .createOne(data)
      .byHackathon(data.hackathonId);

    if (darkLogo || lightLogo) {
      let darkLogoUrl = "";
      let lightLogoUrl = "";

      if (darkLogo) {
        darkLogoUrl = await this.sponsorService.uploadLogo(
          {
            id: sponsor.id,
            name: sponsor.name,
          },
          darkLogo,
          "dark",
        );
      }

      if (lightLogo) {
        lightLogoUrl = await this.sponsorService.uploadLogo(
          {
            id: sponsor.id,
            name: sponsor.name,
          },
          lightLogo,
          "light",
        );
      }

      sponsor = await this.sponsorRepo
        .patchOne(sponsor.id, {
          darkLogo: darkLogoUrl,
          lightLogo: lightLogoUrl,
        })
        .exec();
    }

    this.socket.emit("create:sponsor", sponsor, SocketRoom.MOBILE);

    return sponsor;
  }

  @Get(":id")
  @Roles(Role.TEAM)
  @ApiDoc({
    summary: "Get a Sponsor",
    params: [
      {
        name: "id",
        description: "ID must be set to a sponsor's ID",
      },
    ],
    response: {
      ok: { type: SponsorEntity },
    },
    auth: Role.TEAM,
  })
  async getOne(@Param("id", ParseIntPipe) id: number) {
    return this.sponsorRepo.findOne(id).exec();
  }

  @Patch(":id")
  @Roles(Role.TEAM)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: "lightLogo", maxCount: 1 },
      { name: "darkLogo", maxCount: 1 },
    ]),
  )
  @ApiDoc({
    summary: "Patch a Sponsor",
    request: {
      mimeTypes: ["multipart/form-data"],
      body: { type: SponsorPatchEntity },
    },
    params: [
      {
        name: "id",
        description: "ID must be set to a sponsor's ID",
      },
    ],
    response: {
      ok: { type: SponsorEntity },
    },
    auth: Role.TEAM,
  })
  async patchOne(
    @Param("id", ParseIntPipe) id: number,
    @Body(
      new ValidationPipe({
        forbidNonWhitelisted: true,
        whitelist: true,
        transform: true,
      }),
    )
    data: SponsorPatchEntity,
    @UploadedFiles() files: UploadedLogos,
  ) {
    const { darkLogo, lightLogo } = files;

    const currentSponsor = await this.sponsorRepo.findOne(id).exec();
    let logoUrl = null;

    if (darkLogo) {
      await this.sponsorService.deleteLogo(
        {
          id,
          name: currentSponsor.name,
        },
        "dark",
      );

      logoUrl = await this.sponsorService.uploadLogo(
        {
          id,
          name: data.name ?? currentSponsor.name,
        },
        darkLogo,
        "dark",
      );
    }

    if (lightLogo) {
      await this.sponsorService.deleteLogo(
        {
          id,
          name: currentSponsor.name,
        },
        "light",
      );

      await this.sponsorService.uploadLogo(
        {
          id,
          name: data.name ?? currentSponsor.name,
        },
        lightLogo,
        "dark",
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
  @Roles(Role.TEAM)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: "lightLogo", maxCount: 1 },
      { name: "darkLogo", maxCount: 1 },
    ]),
  )
  @ApiDoc({
    summary: "Replace a Sponsor",
    request: {
      mimeTypes: ["multipart/form-data"],
      body: { type: SponsorCreateEntity },
      validate: true,
    },
    params: [
      {
        name: "id",
        description: "ID must be set to a sponsor's ID",
      },
    ],
    response: {
      ok: { type: SponsorEntity },
    },
    auth: Role.TEAM,
  })
  async replaceOne(
    @Param("id", ParseIntPipe) id: number,
    @Body(
      new ValidationPipe({
        forbidNonWhitelisted: true,
        whitelist: true,
        transform: true,
      }),
    )
    data: SponsorCreateEntity,
    @UploadedFiles() files: UploadedLogos,
  ) {
    const { darkLogo, lightLogo } = files;

    const currentSponsor = await this.sponsorRepo.findOne(id).exec();

    await this.sponsorService.deleteLogo(
      {
        id,
        name: currentSponsor.name,
      },
      "light",
    );

    await this.sponsorService.deleteLogo(
      {
        id,
        name: currentSponsor.name,
      },
      "dark",
    );

    let darkLogoUrl = "";
    let lightLogoUrl = "";

    if (darkLogo) {
      // Insert new logo with new name
      darkLogoUrl = await this.sponsorService.uploadLogo(
        {
          id,
          name: data.name,
        },
        darkLogo,
        "dark",
      );
    }

    if (lightLogo) {
      lightLogoUrl = await this.sponsorService.uploadLogo(
        {
          id,
          name: data.name,
        },
        lightLogo,
        "light",
      );
    }

    // fills hackathonId based on currently active
    const sponsor = await this.sponsorRepo
      .replaceOne(id, {
        ...data,
        lightLogo: lightLogoUrl,
        darkLogo: darkLogoUrl,
      })
      .exec();

    this.socket.emit("update:sponsor", sponsor, SocketRoom.MOBILE);

    return sponsor;
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(Role.TEAM)
  @ApiDoc({
    summary: "Delete a Sponsor",
    params: [
      {
        name: "id",
        description: "ID must be set to a sponsor's ID",
      },
    ],
    response: {
      noContent: true,
    },
    auth: Role.TEAM,
  })
  async deleteOne(@Param("id", ParseIntPipe) id: number) {
    const currentSponsor = await this.sponsorRepo.findOne(id).exec();

    await this.sponsorService.deleteLogo(
      {
        id,
        name: currentSponsor.name,
      },
      "light",
    );

    await this.sponsorService.deleteLogo(
      {
        id,
        name: currentSponsor.name,
      },
      "dark",
    );

    const sponsor = await this.sponsorRepo.deleteOne(id).exec();

    this.socket.emit("update:sponsor", sponsor, SocketRoom.MOBILE);

    return sponsor;
  }

  @Patch("/batch/update")
  @Roles(Role.TEAM)
  @ApiDoc({
    summary: "Batch Update Sponsors",
    request: {
      body: { type: [SponsorPatchBatchEntity] },
    },
    response: {
      ok: { type: [SponsorEntity] },
    },
    auth: Role.TEAM,
  })
  async patchBatch(
    @Body(
      new ParseArrayPipe({
        items: SponsorPatchBatchEntity,
        forbidNonWhitelisted: true,
        whitelist: true,
        transformOptions: {
          groups: [ControllerMethod.BATCH],
          exposeUnsetFields: false,
        },
      }),
    )
    data: SponsorPatchBatchEntity[],
  ) {
    const sponsors = await Promise.all(
      data.map(({ id, ...data }) => this.sponsorRepo.patchOne(id, data).exec()),
    );

    this.socket.emit("batch_update:sponsor", sponsors, SocketRoom.MOBILE);

    return sponsors;
  }
}
