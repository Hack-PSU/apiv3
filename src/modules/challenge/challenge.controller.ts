import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseFilters,
  ValidationPipe,
} from "@nestjs/common";
import { InjectRepository, Repository } from "common/objection";
import { Challenge, ChallengeEntity } from "entities/challenge.entity";
import { SocketGateway } from "modules/socket/socket.gateway";
import { ApiTags, OmitType, PartialType } from "@nestjs/swagger";
import { SocketRoom } from "common/socket";
import { Role, Roles } from "common/gcp";
import { ApiDoc } from "common/docs";
import { DBExceptionFilter } from "common/filters";

class ChallengeCreateEntity extends OmitType(ChallengeEntity, [
  "id",
] as const) {}

class ChallengePatchEntity extends PartialType(ChallengeCreateEntity) {}

@ApiTags("Challenges")
@Controller("challenges")
@UseFilters(DBExceptionFilter)
export class ChallengeController {
  constructor(
    @InjectRepository(Challenge)
    private readonly challengeRepo: Repository<Challenge>,
    private readonly socket: SocketGateway,
  ) {}

  @Get("/")
  @Roles(Role.NONE)
  @ApiDoc({
    summary: "Get All Challenges",
    query: [
      {
        name: "hackathonId",
        type: String,
        required: false,
        description:
          "The ID of a valid hackathon. Defaults to the active hackathon.",
      },
    ],
    response: {
      ok: { type: [ChallengeEntity] },
    },
    auth: Role.NONE,
  })
  async getAll(@Query("hackathonId") hackathonId?: string) {
    return this.challengeRepo.findAll().byHackathon(hackathonId);
  }

  @Get(":id")
  @Roles(Role.NONE)
  @ApiDoc({
    summary: "Get a Challenge",
    params: [
      {
        name: "id",
        description: "ID must be set to a challenge's ID",
      },
    ],
    response: {
      ok: { type: ChallengeEntity },
    },
    auth: Role.NONE,
  })
  async getOne(@Param("id", ParseIntPipe) id: number) {
    const challenge = await this.challengeRepo.findOne(id).exec();

    if (!challenge) {
      throw new NotFoundException("Challenge not found");
    }

    return challenge;
  }

  @Post("/")
  @Roles(Role.TEAM)
  @ApiDoc({
    summary: "Create a Challenge",
    request: {
      body: { type: ChallengeCreateEntity },
    },
    response: {
      created: { type: ChallengeEntity },
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
    data: ChallengeCreateEntity,
  ) {
    // fills hackathonId based on the given or currently active hackathon
    const challenge = await this.challengeRepo
      .createOne(data)
      .byHackathon(data.hackathonId);

    this.socket.emit("create:challenge", challenge, SocketRoom.MOBILE);

    return challenge;
  }

  @Patch(":id")
  @Roles(Role.TEAM)
  @ApiDoc({
    summary: "Patch a Challenge",
    request: {
      body: { type: ChallengePatchEntity },
    },
    params: [
      {
        name: "id",
        description: "ID must be set to a challenge's ID",
      },
    ],
    response: {
      ok: { type: ChallengeEntity },
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
    data: ChallengePatchEntity,
  ) {
    const challenge = await this.challengeRepo.patchOne(id, data).exec();

    if (!challenge) {
      throw new NotFoundException("Challenge not found");
    }

    this.socket.emit("update:challenge", challenge, SocketRoom.MOBILE);

    return challenge;
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(Role.TEAM)
  @ApiDoc({
    summary: "Delete a Challenge",
    params: [
      {
        name: "id",
        description: "ID must be set to a challenge's ID",
      },
    ],
    response: {
      noContent: true,
    },
    auth: Role.TEAM,
  })
  async deleteOne(@Param("id", ParseIntPipe) id: number) {
    const deleted = await this.challengeRepo.deleteOne(id).exec();

    if (!deleted) {
      throw new NotFoundException("Challenge not found");
    }

    this.socket.emit("delete:challenge", { id }, SocketRoom.MOBILE);
  }
}
