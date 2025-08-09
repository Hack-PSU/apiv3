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
  Query,
  Req,
  UseFilters,
  ValidationPipe,
} from "@nestjs/common";
import { ApiTags, ApiProperty } from "@nestjs/swagger";
import { TeamService, CreateTeamDto } from "./team.service";
import { TeamRosterEntity, TeamRole } from "entities/team-roster.entity";
import { ApiDoc } from "common/docs";
import { DBExceptionFilter } from "common/filters";
import { IsString, IsEnum, IsEmail } from "class-validator";

class CreateTeamRequest {
  @ApiProperty()
  @IsString()
  teamName: string;

  @ApiProperty()
  @IsString()
  hackathonId: string;
}

class AddMemberRequest {
  @ApiProperty({ description: "Email address of the user to add to the team" })
  @IsEmail()
  email: string;

  @ApiProperty({ enum: TeamRole })
  @IsEnum(TeamRole)
  role: TeamRole;
}

class UpdateMemberRequest {
  @ApiProperty({ enum: TeamRole })
  @IsEnum(TeamRole)
  role: TeamRole;
}

class TeamQueryParams {
  @ApiProperty()
  @IsString()
  hackathonId: string;
}

@ApiTags("Teams")
@Controller("teams")
@UseFilters(DBExceptionFilter)
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Post("/")
  @ApiDoc({
    summary: "Create Team",
    request: {
      body: { type: CreateTeamRequest },
      validate: true,
    },
    response: {
      created: { type: [TeamRosterEntity] },
    },
  })
  async createTeam(
    @Body(new ValidationPipe({ transform: true })) data: CreateTeamRequest,
    @Req() req: any,
  ) {
    const createTeamDto: CreateTeamDto = {
      teamName: data.teamName,
      leadUserId: req.user?.sub,
      hackathonId: data.hackathonId,
    };

    return this.teamService.createTeam(createTeamDto);
  }

  @Get("/my-team")
  @ApiDoc({
    summary: "Get Current User's Team",
    response: {
      ok: { type: [TeamRosterEntity] },
    },
  })
  async getMyTeam(
    @Query(new ValidationPipe({ transform: true })) query: TeamQueryParams,
    @Req() req: any,
  ) {
    return this.teamService.getUserTeam(req.user?.sub, query.hackathonId);
  }

  @Get("/:teamId/roster")
  @ApiDoc({
    summary: "Get Team Roster",
    params: [
      {
        name: "teamId",
        description: "Team ID",
      },
    ],
    response: {
      ok: { type: [TeamRosterEntity] },
    },
  })
  async getTeamRoster(
    @Param("teamId") teamId: string,
    @Query(new ValidationPipe({ transform: true })) query: TeamQueryParams,
  ) {
    return this.teamService.getTeamRoster(teamId, query.hackathonId);
  }

  @Post("/:teamId/roster")
  @ApiDoc({
    summary: "Add Team Member by Email",
    params: [
      {
        name: "teamId",
        description: "Team ID",
      },
    ],
    request: {
      body: { type: AddMemberRequest },
      validate: true,
    },
    response: {
      created: { type: TeamRosterEntity },
    },
  })
  async addMember(
    @Param("teamId") teamId: string,
    @Body(new ValidationPipe({ transform: true })) data: AddMemberRequest,
    @Query("hackathonId") hackathonId: string,
    @Req() req: any,
  ) {
    return this.teamService.addMember(teamId, data, hackathonId, req.user?.sub);
  }

  @Delete("/:teamId/roster/:userId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiDoc({
    summary: "Remove Team Member",
    params: [
      {
        name: "teamId",
        description: "Team ID",
      },
      {
        name: "userId",
        description: "User ID to remove",
      },
    ],
    response: {
      noContent: true,
    },
  })
  async removeMember(
    @Param("teamId") teamId: string,
    @Param("userId") userId: string,
    @Query(new ValidationPipe({ transform: true })) query: TeamQueryParams,
    @Req() req: any,
  ) {
    await this.teamService.removeMember(
      teamId,
      userId,
      query.hackathonId,
      req.user?.sub,
    );
  }

  @Patch("/:teamId/roster/:userId")
  @ApiDoc({
    summary: "Update Team Member Role",
    params: [
      {
        name: "teamId",
        description: "Team ID",
      },
      {
        name: "userId",
        description: "User ID to update",
      },
    ],
    request: {
      body: { type: UpdateMemberRequest },
      validate: true,
    },
    response: {
      ok: { type: TeamRosterEntity },
    },
  })
  async updateMemberRole(
    @Param("teamId") teamId: string,
    @Param("userId") userId: string,
    @Body(new ValidationPipe({ transform: true })) data: UpdateMemberRequest,
    @Query("hackathonId") hackathonId: string,
    @Req() req: any,
  ) {
    return this.teamService.updateMemberRole(
      teamId,
      userId,
      data,
      hackathonId,
      req.user?.sub,
    );
  }
}
