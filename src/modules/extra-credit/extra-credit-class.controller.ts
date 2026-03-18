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
  Put,
  UseFilters,
  ValidationPipe,
} from "@nestjs/common";
import { InjectRepository, Repository } from "common/objection";
import {
  ExtraCreditClass,
  ExtraCreditClassEntity,
} from "entities/extra-credit-class.entity";
import {
  ApiExtraModels,
  ApiProperty,
  ApiTags,
  OmitType,
  PartialType,
} from "@nestjs/swagger";
import { Role, Roles } from "common/gcp";
import { ApiDoc } from "common/docs";
import { DBExceptionFilter } from "common/filters";

import { ref } from "objection";
import { User, UserEntity } from "entities/user.entity";
import { Scan } from "entities/scan.entity";
import { Team } from "entities/team.entity";
import { Requirements } from "entities/extra-credit-class.entity";

class ECClassCreateEntity extends OmitType(ExtraCreditClass, ["id"] as const) {}

class ECClassPatchEntity extends PartialType(ECClassCreateEntity) {}

class ECClassAssignedUser {
  @ApiProperty()
  id: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;
}

export class ECClassResponse extends ExtraCreditClassEntity {
  @ApiProperty({ type: [ECClassAssignedUser] })
  users: ECClassAssignedUser[];
}

class QualifiedListResponse {
  @ApiProperty({ type: [String] })
  names: string[];
}

@ApiTags("Extra Credit")
@Controller("extra-credit/classes")
@UseFilters(DBExceptionFilter)
@ApiExtraModels(ECClassResponse)
export class ExtraCreditClassController {
  constructor(
    @InjectRepository(ExtraCreditClass)
    private readonly ecClassRepo: Repository<ExtraCreditClass>,
  ) {}

  @Get("/")
  @Roles(Role.NONE)
  @ApiDoc({
    summary: "Get All Extra Credit Classes",
    response: {
      ok: { type: [ExtraCreditClassEntity] },
    },
    auth: Role.NONE,
  })
  async getAll() {
    return this.ecClassRepo.findAll().byHackathon();
  }

  @Post("/")
  @Roles(Role.TEAM)
  @ApiDoc({
    summary: "Create an Extra Credit Class",
    request: {
      body: { type: ECClassCreateEntity },
      validate: true,
    },
    response: {
      created: { type: ExtraCreditClassEntity },
    },
    auth: Role.TEAM,
  })
  async createOne(
    @Body(
      new ValidationPipe({
        forbidNonWhitelisted: true,
        whitelist: true,
        transform: true,
      }),
    )
    data: ECClassCreateEntity,
  ) {
    return this.ecClassRepo.createOne(data).byHackathon();
  }

  @Get(":id")
  @Roles(Role.TEAM)
  @ApiDoc({
    summary: "Get an Extra Credit class",
    params: [
      {
        name: "id",
        description: "ID must be set to a class's ID",
      },
    ],
    response: {
      ok: { type: ECClassResponse },
    },
    auth: Role.TEAM,
  })
  async getOne(@Param("id") id: number) {
    return this.ecClassRepo.findOne(id).raw().withGraphFetched("users");
  }

  @Put(":id")
  @Roles(Role.TEAM)
  @ApiDoc({
    summary: "Replace an Extra Credit Class",
    params: [
      {
        name: "id",
        description: "ID must be set to a class's ID",
      },
    ],
    request: {
      body: { type: ECClassCreateEntity },
      validate: true,
    },
    response: {
      ok: { type: ExtraCreditClassEntity },
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
    data: ECClassCreateEntity,
  ) {
    return this.ecClassRepo.replaceOne(id, data).exec();
  }

  @Patch(":id")
  @Roles(Role.TEAM)
  @ApiDoc({
    summary: "Patch an Extra Credit Class",
    params: [
      {
        name: "id",
        description: "ID must be set to a class's ID",
      },
    ],
    request: {
      body: { type: ECClassPatchEntity },
      validate: true,
    },
    response: {
      ok: { type: ExtraCreditClassEntity },
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
    data: ECClassPatchEntity,
  ) {
    return this.ecClassRepo.patchOne(id, data).exec();
  }

  @Delete(":id")
  @Roles(Role.TEAM)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiDoc({
    summary: "Delete an Extra Credit Class",
    params: [
      {
        name: "id",
        description: "ID must be set to a class's ID",
      },
    ],
    response: {
      noContent: true,
    },
    auth: Role.TEAM,
  })
  async deleteOne(@Param("id") id: number) {
    return this.ecClassRepo.deleteOne(id).exec();
  }

  @Get("list/:id")
  @Roles(Role.TEAM)
  @ApiDoc({
    summary: "Get a list of qualified users for an Extra Credit Class",
    params: [
      {
        name: "id",
        description: "ID must be set to a class's ID",
      },
    ],
    response: {
      ok: { type: QualifiedListResponse },
    },
    auth: Role.TEAM,
  })
  async getQualifiedList(@Param("id", ParseIntPipe) id: number) {
    const ecClass = await this.ecClassRepo.findOne(id).exec();

    if (!ecClass) {
      throw new NotFoundException("Extra credit class not found");
    }

    const qb = User.query()
      .select("users.firstName", "users.lastName")
      .joinRelated("extraCreditClasses")
      .where("extraCreditClasses.id", id);

    if (ecClass.requirement === Requirements.CHECK_IN) {
      qb.whereExists(
        Scan.query()
          .join("events", "events.id", "scans.eventId")
          .where("events.name", "Check-in")
          .where("scans.userId", ref("users.id")),
      );
    } else if (ecClass.requirement === Requirements.SUBMIT) {
      qb.whereExists(
        Team.query()
          .where(function () {
            this.where("teams.member1", ref("users.id"))
              .orWhere("teams.member2", ref("users.id"))
              .orWhere("teams.member3", ref("users.id"))
              .orWhere("teams.member4", ref("users.id"))
              .orWhere("teams.member5", ref("users.id"));
          })
          .join("projects", "projects.teamId", "teams.id"),
      );
    } else if (ecClass.requirement === Requirements.EXPO) {
      qb.whereExists(
        Scan.query()
          .join("events", "events.id", "scans.eventId")
          .where("events.name", "Judging Expo")
          .where("scans.userId", ref("users.id")),
      );
    }
    // else case is if the requirement is other, in which they have special requirements
    // that cannot be determined by the system.

    const users = await qb;
    const names = users.map((user) => `${user.lastName}, ${user.firstName}`);

    return { names };
  }
}
