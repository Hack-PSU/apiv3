import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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

class ECClassCreateEntity extends OmitType(ExtraCreditClass, ["id"] as const) {}

class ECClassPatchEntity extends PartialType(ECClassCreateEntity) {}

class ECClassAssignedUser {
  @ApiProperty()
  id: string;
}

class ECClassResponse extends ExtraCreditClassEntity {
  @ApiProperty({ type: [ECClassAssignedUser] })
  users: ECClassAssignedUser[];
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
}
