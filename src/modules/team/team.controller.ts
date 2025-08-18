import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseFilters,
  ValidationPipe,
} from "@nestjs/common";
import { InjectRepository, Repository } from "common/objection";
import { Team, TeamEntity } from "entities/team.entity";
import { User } from "entities/user.entity";
import { Hackathon } from "entities/hackathon.entity";
import { ApiProperty, ApiTags, OmitType, PartialType } from "@nestjs/swagger";
import { Role, Roles } from "common/gcp";
import { ApiDoc } from "common/docs";
import { DBExceptionFilter } from "common/filters";
import { IsEmail, IsOptional, IsString } from "class-validator";
import { Transform } from "class-transformer";
import { nanoid } from "nanoid";

class TeamCreateEntity extends OmitType(TeamEntity, [
  "id",
  "hackathonId",
  "isActive",
] as const) {}

class TeamUpdateEntity extends PartialType(TeamCreateEntity) {
  @ApiProperty({ type: "string", required: false, nullable: true })
  @IsOptional()
  @IsString()
  member1?: string;

  @ApiProperty({ type: "string", required: false, nullable: true })
  @IsOptional()
  @IsString()
  member2?: string;

  @ApiProperty({ type: "string", required: false, nullable: true })
  @IsOptional()
  @IsString()
  member3?: string;

  @ApiProperty({ type: "string", required: false, nullable: true })
  @IsOptional()
  @IsString()
  member4?: string;

  @ApiProperty({ type: "string", required: false, nullable: true })
  @IsOptional()
  @IsString()
  member5?: string;
}

class AddUserByEmailEntity {
  @ApiProperty()
  @IsEmail()
  email: string;
}

class ActiveTeamsParams {
  @ApiProperty({
    required: false,
    description: "active can either be a boolean or undefined",
  })
  @IsOptional()
  @Transform(({ value }) => {
    switch (value) {
      case "true":
        return true;
      case "false":
        return false;
      default:
        return undefined;
    }
  })
  active?: boolean;
}

@ApiTags("Teams")
@Controller("teams")
@UseFilters(DBExceptionFilter)
export class TeamController {
  constructor(
    @InjectRepository(Team)
    private readonly teamRepo: Repository<Team>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  @Get("/")
  @Roles(Role.NONE)
  @ApiDoc({
    summary: "Get All Teams",
    query: [
      {
        name: "active",
        type: ActiveTeamsParams,
      },
    ],
    response: {
      ok: { type: [TeamEntity] },
    },
    auth: Role.TEAM,
  })
  async getAll(
    @Query(new ValidationPipe({ transform: true }))
    { active }: ActiveTeamsParams,
  ) {
    if (active === undefined || active === true) {
      return this.teamRepo.findAll().byHackathon();
    } else if (active === false) {
      return this.teamRepo.findAll().exec();
    }
  }

  @Post("/")
  @Roles(Role.NONE)
  @ApiDoc({
    summary: "Create a Team",
    request: {
      body: { type: TeamCreateEntity },
      validate: true,
    },
    response: {
      created: { type: TeamEntity },
    },
    auth: Role.TEAM,
  })
  async createOne(
    @Body(
      new ValidationPipe({
        enableDebugMessages: true,
        forbidNonWhitelisted: true,
        whitelist: true,
        transform: true,
      }),
    )
    data: TeamCreateEntity,
  ) {
    // Validate user IDs if provided
    const memberFields = [
      "member1",
      "member2",
      "member3",
      "member4",
      "member5",
    ];
    const memberIds = [];

    for (const field of memberFields) {
      if (data[field]) {
        const user = await this.userRepo.findOne(data[field]).exec();
        if (!user) {
          throw new BadRequestException(
            `User with ID ${data[field]} not found`,
          );
        }
        memberIds.push(data[field]);
      }
    }

    // Check for duplicate members
    const uniqueMembers = new Set(memberIds);
    if (uniqueMembers.size !== memberIds.length) {
      throw new BadRequestException("Duplicate members are not allowed");
    }

    // Check if any user is already in another team in the current hackathon
    if (memberIds.length > 0) {
      const existingTeams = await this.teamRepo
        .findAll()
        .byHackathon()
        .where((builder) => {
          memberIds.forEach((memberId) => {
            builder
              .orWhere("member1", memberId)
              .orWhere("member2", memberId)
              .orWhere("member3", memberId)
              .orWhere("member4", memberId)
              .orWhere("member5", memberId);
          });
        });

      if (existingTeams.length > 0) {
        const conflictingUser = memberIds.find((memberId) =>
          existingTeams.some((team: any) =>
            [
              team.member1,
              team.member2,
              team.member3,
              team.member4,
              team.member5,
            ].includes(memberId),
          ),
        );
        throw new BadRequestException(
          `User ${conflictingUser} is already a member of another team`,
        );
      }
    }

    // Get active hackathon
    const hackathon = await Hackathon.query().findOne({ active: true });
    if (!hackathon) {
      throw new NotFoundException("No active hackathon found");
    }

    const team = await this.teamRepo
      .createOne({
        id: nanoid(),
        hackathonId: hackathon.id,
        isActive: true,
        ...data,
      })
      .exec();

    return team;
  }

  @Get(":id")
  @Roles(Role.NONE)
  @ApiDoc({
    summary: "Get a Team",
    auth: Role.TEAM,
    params: [{ name: "id", description: "ID must be set to a team's ID" }],
    response: {
      ok: { type: TeamEntity },
    },
  })
  async getOne(@Param("id") id: string) {
    const team = await this.teamRepo.findOne(id).exec();
    return team;
  }

  @Patch(":id")
  @Roles(Role.NONE)
  @ApiDoc({
    summary: "Update a Team",
    params: [
      {
        name: "id",
        description: "ID must be set to a team's ID",
      },
    ],
    request: {
      body: { type: TeamUpdateEntity },
      validate: true,
    },
    response: {
      ok: { type: TeamEntity },
    },
    auth: Role.TEAM,
  })
  async patchOne(
    @Param("id") id: string,
    @Body(
      new ValidationPipe({
        forbidNonWhitelisted: true,
        whitelist: true,
        transform: true,
        transformOptions: {
          exposeUnsetFields: false,
        },
      }),
    )
    data: TeamUpdateEntity,
  ) {
    const existingTeam = await this.teamRepo.findOne(id).exec();

    if (!existingTeam) {
      throw new NotFoundException("Team not found");
    }

    if (!existingTeam.isActive) {
      throw new BadRequestException("Cannot modify inactive team");
    }

    // Validate user IDs if provided
    const memberFields = [
      "member1",
      "member2",
      "member3",
      "member4",
      "member5",
    ];
    for (const field of memberFields) {
      if (data[field]) {
        const user = await this.userRepo.findOne(data[field]).exec();
        if (!user) {
          throw new BadRequestException(
            `User with ID ${data[field]} not found`,
          );
        }
      }
    }

    // Check for duplicate members in the update
    const memberIds = memberFields
      .map((field) => data[field] || existingTeam[field])
      .filter(Boolean);

    const uniqueMembers = new Set(memberIds);
    if (uniqueMembers.size !== memberIds.length) {
      throw new BadRequestException("Duplicate members are not allowed");
    }

    // Ensure team doesn't exceed 5 members
    if (memberIds.length > 5) {
      throw new BadRequestException("Team cannot have more than 5 members");
    }

    // Check if any new user is already in another team in the current hackathon
    const newMemberIds = memberFields
      .filter((field) => data[field] && data[field] !== existingTeam[field])
      .map((field) => data[field]);

    if (newMemberIds.length > 0) {
      const existingTeams = await this.teamRepo
        .findAll()
        .byHackathon()
        .where((builder) => {
          newMemberIds.forEach((memberId) => {
            builder
              .orWhere("member1", memberId)
              .orWhere("member2", memberId)
              .orWhere("member3", memberId)
              .orWhere("member4", memberId)
              .orWhere("member5", memberId);
          });
        })
        .andWhereNot("id", id);

      if (existingTeams.length > 0) {
        const conflictingUser = newMemberIds.find((memberId) =>
          existingTeams.some((team: any) =>
            [
              team.member1,
              team.member2,
              team.member3,
              team.member4,
              team.member5,
            ].includes(memberId),
          ),
        );
        throw new BadRequestException(
          `User ${conflictingUser} is already a member of another team`,
        );
      }
    }

    const team = await this.teamRepo.patchOne(id, data).exec();
    return team;
  }

  @Post(":id/add-user")
  @Roles(Role.NONE)
  @ApiDoc({
    summary: "Add User to Team by Email",
    params: [
      {
        name: "id",
        description: "ID must be set to a team's ID",
      },
    ],
    request: {
      body: { type: AddUserByEmailEntity },
      validate: true,
    },
    response: {
      ok: { type: TeamEntity },
    },
    auth: Role.TEAM,
  })
  async addUserByEmail(
    @Param("id") id: string,
    @Body(
      new ValidationPipe({
        forbidNonWhitelisted: true,
        whitelist: true,
        transform: true,
      }),
    )
    data: AddUserByEmailEntity,
  ) {
    const team = await this.teamRepo.findOne(id).exec();

    if (!team) {
      throw new NotFoundException("Team not found");
    }

    if (!team.isActive) {
      throw new BadRequestException("Cannot modify inactive team");
    }

    // Find user by email
    const user = await this.userRepo
      .findAll()
      .raw()
      .where("email", data.email)
      .first();

    if (!user) {
      throw new NotFoundException(`User with email ${data.email} not found`);
    }

    // Check if user is already in this team
    const currentMembers = [
      team.member1,
      team.member2,
      team.member3,
      team.member4,
      team.member5,
    ].filter(Boolean);

    if (currentMembers.includes(user.id)) {
      throw new BadRequestException("User is already a member of this team");
    }

    // Check if user is already in any other team in the current hackathon
    const existingTeams = await this.teamRepo
      .findAll()
      .byHackathon()
      .where((builder) => {
        builder
          .where("member1", user.id)
          .orWhere("member2", user.id)
          .orWhere("member3", user.id)
          .orWhere("member4", user.id)
          .orWhere("member5", user.id);
      });

    if (existingTeams.length > 0) {
      throw new BadRequestException("User is already a member of another team");
    }

    // Find first empty slot
    const updateData: Partial<Team> = {};

    if (!team.member1) {
      updateData.member1 = user.id;
    } else if (!team.member2) {
      updateData.member2 = user.id;
    } else if (!team.member3) {
      updateData.member3 = user.id;
    } else if (!team.member4) {
      updateData.member4 = user.id;
    } else if (!team.member5) {
      updateData.member5 = user.id;
    } else {
      throw new BadRequestException(
        "Team is already at maximum capacity (5 members)",
      );
    }

    const updatedTeam = await this.teamRepo.patchOne(id, updateData).exec();
    return updatedTeam;
  }
}
