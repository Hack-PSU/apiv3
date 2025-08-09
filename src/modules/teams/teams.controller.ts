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
  Req,
  UnauthorizedException,
  UseFilters,
  ValidationPipe,
} from "@nestjs/common";
import { ApiProperty, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { IsString, IsEmail } from "class-validator";
import { TeamsService } from "./teams.service";
import { TeamRosterEntity, TeamRole } from "entities/team-roster.entity";
import { UserEntity } from "entities/user.entity";
import { ApiDoc } from "common/docs";
import { DBExceptionFilter } from "common/filters";
import { Roles, Role, RestrictedRoles } from "common/gcp";

class CreateTeamDto {
  @ApiProperty()
  @IsString()
  teamName: string;
}

class AddMemberDto {
  @ApiProperty()
  @IsString()
  teamId: string;

  @ApiProperty()
  @IsEmail()
  userEmail: string;
}

class ChangeLeadDto {
  @ApiProperty()
  @IsString()
  teamId: string;

  @ApiProperty()
  @IsString()
  newLeadUserId: string;
}

class TransferUserDto {
  @ApiProperty()
  @IsString()
  userId: string;

  @ApiProperty()
  @IsString()
  newTeamId: string;

  @ApiProperty()
  @IsString()
  newTeamName: string;
}

class RenameTeamDto {
  @ApiProperty()
  @IsString()
  teamId: string;

  @ApiProperty()
  @IsString()
  newTeamName: string;
}

class TeamRosterWithUser extends TeamRosterEntity {
  @ApiProperty({ type: UserEntity, nullable: true })
  user?: UserEntity;
}

class TeamsOverviewItem {
  @ApiProperty()
  teamId: string;

  @ApiProperty()
  teamName: string;

  @ApiProperty()
  members: number;
}

@ApiTags("Teams")
@Controller("teams")
@UseFilters(DBExceptionFilter)
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post("create")
  @Roles(Role.NONE)
  @ApiDoc({
    summary: "Create a New Team",
    request: {
      body: { type: CreateTeamDto },
      validate: true,
    },
    response: {
      created: { type: TeamRosterEntity },
    },
    auth: Role.NONE,
  })
  async createTeam(
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    data: CreateTeamDto,
    @Req() req: Request,
  ) {
    if (!req.user || !("sub" in req.user)) {
      throw new UnauthorizedException();
    }

    const userId = String(req.user.sub);
    return this.teamsService.createTeam(userId, data.teamName);
  }

  @Post("add-member")
  @Roles(Role.NONE)
  @ApiDoc({
    summary: "Add Member to Team (Team Lead Only)",
    request: {
      body: { type: AddMemberDto },
      validate: true,
    },
    response: {
      created: { type: TeamRosterEntity },
    },
    auth: Role.NONE,
  })
  async addMember(
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    data: AddMemberDto,
    @Req() req: Request,
  ) {
    if (!req.user || !("sub" in req.user)) {
      throw new UnauthorizedException();
    }

    // Check if user is the team lead
    const userId = String(req.user.sub);
    const userTeam = await this.teamsService.getUserTeam(userId);
    if (
      !userTeam ||
      userTeam.role !== TeamRole.LEAD ||
      userTeam.teamId !== data.teamId
    ) {
      throw new UnauthorizedException("Only team leads can add members");
    }

    return this.teamsService.addMemberByEmail(data.teamId, data.userEmail);
  }

  @Patch("change-lead")
  @Roles(Role.NONE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiDoc({
    summary: "Change Team Lead (Current Lead Only)",
    request: {
      body: { type: ChangeLeadDto },
      validate: true,
    },
    response: {
      noContent: true,
    },
    auth: Role.NONE,
  })
  async changeTeamLead(
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    data: ChangeLeadDto,
    @Req() req: Request,
  ) {
    if (!req.user || !("sub" in req.user)) {
      throw new UnauthorizedException();
    }

    // Check if user is the current team lead
    const userId = String(req.user.sub);
    const userTeam = await this.teamsService.getUserTeam(userId);
    if (
      !userTeam ||
      userTeam.role !== TeamRole.LEAD ||
      userTeam.teamId !== data.teamId
    ) {
      throw new UnauthorizedException(
        "Only current team lead can change leadership",
      );
    }

    return this.teamsService.makeTeamLead(data.teamId, data.newLeadUserId);
  }

  @Delete("remove-member/:userId")
  @RestrictedRoles({
    roles: [Role.NONE],
    predicate: (req) => req.user && req.params.userId === req.user?.sub,
  })
  @Roles(Role.TEAM)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiDoc({
    summary: "Remove Member from Team",
    params: [{ name: "userId", description: "User ID to remove" }],
    response: {
      noContent: true,
    },
    auth: Role.NONE,
    restricted: true,
  })
  async removeMember(@Param("userId") userId: string) {
    return this.teamsService.removeMember(userId);
  }

  @Patch("transfer-user")
  @Roles(Role.TEAM)
  @ApiDoc({
    summary: "Transfer User to Another Team (Organizers Only)",
    request: {
      body: { type: TransferUserDto },
      validate: true,
    },
    response: {
      ok: { type: TeamRosterEntity },
    },
    auth: Role.TEAM,
  })
  async transferUser(
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    data: TransferUserDto,
  ) {
    return this.teamsService.transferUser(
      data.userId,
      data.newTeamId,
      data.newTeamName,
    );
  }

  @Patch("rename")
  @Roles(Role.NONE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiDoc({
    summary: "Rename Team (Team Lead Only)",
    request: {
      body: { type: RenameTeamDto },
      validate: true,
    },
    response: {
      noContent: true,
    },
    auth: Role.NONE,
  })
  async renameTeam(
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    data: RenameTeamDto,
    @Req() req: Request,
  ) {
    if (!req.user || !("sub" in req.user)) {
      throw new UnauthorizedException();
    }

    // Check if user is the team lead
    const userId = String(req.user.sub);
    const userTeam = await this.teamsService.getUserTeam(userId);
    if (
      !userTeam ||
      userTeam.role !== TeamRole.LEAD ||
      userTeam.teamId !== data.teamId
    ) {
      throw new UnauthorizedException("Only team leads can rename teams");
    }

    return this.teamsService.renameTeam(data.teamId, data.newTeamName);
  }

  @Delete(":teamId")
  @Roles(Role.TEAM)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiDoc({
    summary: "Delete Team (Organizers Only)",
    params: [{ name: "teamId", description: "Team ID to delete" }],
    response: {
      noContent: true,
    },
    auth: Role.TEAM,
  })
  async deleteTeam(@Param("teamId") teamId: string) {
    return this.teamsService.deleteTeam(teamId);
  }

  // Query endpoints

  @Get("user/:userId")
  @RestrictedRoles({
    roles: [Role.NONE],
    predicate: (req) => req.user && req.params.userId === req.user?.sub,
  })
  @Roles(Role.TEAM)
  @ApiDoc({
    summary: "Get User's Team",
    params: [{ name: "userId", description: "User ID" }],
    response: {
      ok: { type: TeamRosterWithUser },
    },
    auth: Role.NONE,
    restricted: true,
  })
  async getUserTeam(@Param("userId") userId: string) {
    return this.teamsService.getUserTeam(userId);
  }

  @Get("user/me")
  @Roles(Role.NONE)
  @ApiDoc({
    summary: "Get My Team",
    response: {
      ok: { type: TeamRosterWithUser },
    },
    auth: Role.NONE,
  })
  async getMyTeam(@Req() req: Request) {
    if (!req.user || !("sub" in req.user)) {
      throw new UnauthorizedException();
    }

    const userId = String(req.user.sub);
    return this.teamsService.getUserTeam(userId);
  }

  @Get("roster/:teamId")
  @Roles(Role.NONE)
  @ApiDoc({
    summary: "Get Team Roster",
    params: [{ name: "teamId", description: "Team ID" }],
    response: {
      ok: { type: [TeamRosterWithUser] },
    },
    auth: Role.NONE,
  })
  async getTeamRoster(@Param("teamId") teamId: string) {
    return this.teamsService.getTeamRoster(teamId);
  }

  @Get("overview")
  @Roles(Role.TEAM)
  @ApiDoc({
    summary: "Get Teams Overview",
    response: {
      ok: { type: [TeamsOverviewItem] },
    },
    auth: Role.TEAM,
  })
  async getTeamsOverview() {
    return this.teamsService.getTeamsOverview();
  }
}
