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
import { Hackathon } from "entities/hackathon.entity";
import { ApiAuth } from "common/docs/api-auth";
import { Role } from "common/gcp";

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
  @ApiOperation({ summary: "Get All Extra Credit Classes" })
  @ApiOkResponse({ type: [ExtraCreditClassEntity] })
  @ApiAuth(Role.NONE)
  async getAll() {
    return this.ecClassRepo.findAll().exec();
  }

  @Post("/")
  @ApiOperation({ summary: "Create an Extra Credit Class" })
  @ApiBody({ type: ECClassCreateEntity })
  @ApiOkResponse({ type: ExtraCreditClassEntity })
  @ApiAuth(Role.TEAM)
  async createOne(@Body() data: ECClassCreateEntity) {
    return this.ecClassRepo.createOne(data).exec();
  }

  @Get("/hackathon:hackathonId")
  @ApiOperation({summary: "Get an Extra Credit Class by Hackathon"})
  @ApiBody({type: ECClassCreateEntity})
  @ApiOkResponse({ type: ExtraCreditClassEntity })
  @ApiAuth(Role.TEAM)
  async getBy(@Param("hackathonId") hackathonId: string) {
    if (!hackathonId) {
      return this.ecClassRepo.findAll().raw().withGraphJoined("hackathons").where(
        "ExtraCreditClasses.hackathonId", Hackathon.query().findOne({ active: true }).select("hackathons.id"))
    }
    else {
      return this.ecClassRepo.findAll().raw().where("ExtraCreditClass.hackathonId",hackathonId)
    }
  }
  
  @Get(":id")
  @ApiOperation({ summary: "Get an Extra Credit Class" })
  @ApiParam({ name: "id", description: "ID must be set to a class's ID" })
  @ApiOkResponse({ type: ECClassResponse })
  @ApiAuth(Role.TEAM)
  async getOne(@Param("id") id: number) {
    return this.ecClassRepo.findOne(id).raw().withGraphFetched("users");
  }

  @Put(":id")
  @ApiOperation({ summary: "Replace an Extra Credit Class" })
  @ApiParam({ name: "id", description: "ID must be set to a class's ID" })
  @ApiBody({ type: ECClassCreateEntity })
  @ApiOkResponse({ type: ExtraCreditClassEntity })
  @ApiAuth(Role.TEAM)
  async replaceOne(@Param("id") id: number, @Body() data: ECClassCreateEntity) {
    return this.ecClassRepo.replaceOne(id, data).exec();
  }

  @Patch(":id")
  @ApiOperation({ summary: "Patch an Extra Credit Class" })
  @ApiParam({ name: "id", description: "ID must be set to a class's ID" })
  @ApiBody({ type: ECClassPatchEntity })
  @ApiOkResponse({ type: ExtraCreditClassEntity })
  @ApiAuth(Role.TEAM)
  async patchOne(@Param("id") id: number, @Body() data: ECClassPatchEntity) {
    return this.ecClassRepo.patchOne(id, data).exec();
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete an Extra Credit Class" })
  @ApiParam({ name: "id", description: "ID must be set to a class's ID" })
  @ApiNoContentResponse()
  @ApiAuth(Role.TEAM)
  async deleteOne(@Param("id") id: number) {
    return this.ecClassRepo.deleteOne(id).exec();
  }
}
