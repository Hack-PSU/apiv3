import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
} from "@nestjs/common";
import { InjectRepository, Repository } from "common/objection";
import {
  ExtraCreditClass,
  ExtraCreditClassEntity,
} from "entities/extra-credit-class.entity";
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
import { ApiAuth } from "common/docs/api-auth";
import { Role, Roles } from "common/gcp";

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
@ApiExtraModels(ECClassResponse)
export class ExtraCreditClassController {
  constructor(
    @InjectRepository(ExtraCreditClass)
    private readonly ecClassRepo: Repository<ExtraCreditClass>,
  ) {}

  @Get("/")
  @Roles(Role.NONE)
  @ApiOperation({ summary: "Get All Extra Credit Classes" })
  @ApiOkResponse({ type: [ExtraCreditClassEntity] })
  @ApiAuth(Role.NONE)
  async getAll() {
    return this.ecClassRepo.findAll().exec();
  }

  @Post("/")
  @Roles(Role.TEAM)
  @ApiOperation({ summary: "Create an Extra Credit Class" })
  @ApiBody({ type: ECClassCreateEntity })
  @ApiOkResponse({ type: ExtraCreditClassEntity })
  @ApiAuth(Role.TEAM)
  async createOne(@Body() data: ECClassCreateEntity) {
    return this.ecClassRepo.createOne(data).exec();
  }

  @Get(":id")
  @Roles(Role.TEAM)
  @ApiOperation({ summary: "Get an Extra Credit Class" })
  @ApiParam({ name: "id", description: "ID must be set to a class's ID" })
  @ApiOkResponse({ type: ECClassResponse })
  @ApiAuth(Role.TEAM)
  async getOne(@Param("id") id: number) {
    return this.ecClassRepo.findOne(id).raw().withGraphFetched("users");
  }

  @Put(":id")
  @Roles(Role.TEAM)
  @ApiOperation({ summary: "Replace an Extra Credit Class" })
  @ApiParam({ name: "id", description: "ID must be set to a class's ID" })
  @ApiBody({ type: ECClassCreateEntity })
  @ApiOkResponse({ type: ExtraCreditClassEntity })
  @ApiAuth(Role.TEAM)
  async replaceOne(@Param("id") id: number, @Body() data: ECClassCreateEntity) {
    return this.ecClassRepo.replaceOne(id, data).exec();
  }

  @Patch(":id")
  @Roles(Role.TEAM)
  @ApiOperation({ summary: "Patch an Extra Credit Class" })
  @ApiParam({ name: "id", description: "ID must be set to a class's ID" })
  @ApiBody({ type: ECClassPatchEntity })
  @ApiOkResponse({ type: ExtraCreditClassEntity })
  @ApiAuth(Role.TEAM)
  async patchOne(@Param("id") id: number, @Body() data: ECClassPatchEntity) {
    return this.ecClassRepo.patchOne(id, data).exec();
  }

  @Delete(":id")
  @Roles(Role.TEAM)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete an Extra Credit Class" })
  @ApiParam({ name: "id", description: "ID must be set to a class's ID" })
  @ApiNoContentResponse()
  @ApiAuth(Role.TEAM)
  async deleteOne(@Param("id") id: number) {
    return this.ecClassRepo.deleteOne(id).exec();
  }
}
