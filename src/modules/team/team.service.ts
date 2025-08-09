import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository, Repository } from "common/objection";
import { TeamRoster, TeamRole } from "entities/team-roster.entity";
import { User } from "entities/user.entity";
import { v4 as uuidv4 } from "uuid";

export interface CreateTeamDto {
  teamName: string;
  leadUserId: string;
  hackathonId: string;
}

export interface AddMemberDto {
  email: string;
  role: TeamRole;
}

export interface UpdateMemberDto {
  role: TeamRole;
}

@Injectable()
export class TeamService {
  constructor(
    @InjectRepository(TeamRoster)
    private readonly teamRosterRepo: Repository<TeamRoster>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async createTeam(data: CreateTeamDto): Promise<TeamRoster[]> {
    // Check if lead user exists
    const leadUser = await this.userRepo.findOne(data.leadUserId).exec();
    if (!leadUser) {
      throw new NotFoundException("Lead user not found");
    }

    // Check if user is already in a team (enforces one team per user)
    const existingMembership = await TeamRoster.query()
      .where("userId", data.leadUserId)
      .where("hackathonId", data.hackathonId)
      .where("isActive", true)
      .first();

    if (existingMembership) {
      throw new ConflictException("User is already part of a team");
    }

    const teamId = this.generateTeamId();
    const now = Date.now();

    // Create the team with the lead as the first member
    const teamLead = await this.teamRosterRepo
      .createOne({
        id: uuidv4(),
        teamId,
        teamName: data.teamName,
        userId: data.leadUserId,
        role: TeamRole.LEAD,
        joinedAt: now,
        isActive: true,
        hackathonId: data.hackathonId,
      })
      .exec();

    return [teamLead];
  }

  async getTeamRoster(
    teamId: string,
    hackathonId: string,
  ): Promise<TeamRoster[]> {
    const roster = await TeamRoster.query()
      .where("teamId", teamId)
      .where("hackathonId", hackathonId)
      .where("isActive", true)
      .withGraphJoined("user")
      .orderBy("joinedAt", "asc");

    if (roster.length === 0) {
      throw new NotFoundException("Team not found");
    }

    return roster;
  }

  async addMember(
    teamId: string,
    data: AddMemberDto,
    hackathonId: string,
    requestingUserId: string,
  ): Promise<TeamRoster> {
    // Verify requesting user is team lead
    await this.verifyTeamLead(teamId, requestingUserId, hackathonId);

    // Look up user by email
    const user = await User.query().where("email", data.email).first();

    if (!user) {
      throw new NotFoundException("User with this email not found");
    }

    // Check if user is already in a team (enforces one team per user)
    const existingMembership = await TeamRoster.query()
      .where("userId", user.id)
      .where("hackathonId", hackathonId)
      .where("isActive", true)
      .first();

    if (existingMembership) {
      throw new ConflictException("User is already part of a team");
    }

    // Get current team info
    const currentTeam = await TeamRoster.query()
      .where("teamId", teamId)
      .where("hackathonId", hackathonId)
      .where("isActive", true)
      .first();

    if (!currentTeam) {
      throw new NotFoundException("Team not found");
    }

    // Check team size limit
    const currentMembers = await TeamRoster.query()
      .where("teamId", teamId)
      .where("hackathonId", hackathonId)
      .where("isActive", true);

    if (currentMembers.length >= 5) {
      throw new BadRequestException("Team is full (maximum 5 members)");
    }

    // If adding another lead, verify only one lead rule
    if (data.role === TeamRole.LEAD) {
      const currentLeads = currentMembers.filter(
        (m) => m.role === TeamRole.LEAD,
      );
      if (currentLeads.length >= 1) {
        throw new BadRequestException("Team can only have one lead");
      }
    }

    // Add the member
    const newMember = await this.teamRosterRepo
      .createOne({
        id: uuidv4(),
        teamId,
        teamName: currentTeam.teamName,
        userId: user.id,
        role: data.role,
        joinedAt: Date.now(),
        isActive: true,
        hackathonId,
      })
      .exec();

    return newMember;
  }

  async removeMember(
    teamId: string,
    userId: string,
    hackathonId: string,
    requestingUserId: string,
  ): Promise<void> {
    // Verify requesting user is team lead or removing themselves
    const membership = await TeamRoster.query()
      .where("teamId", teamId)
      .where("userId", userId)
      .where("hackathonId", hackathonId)
      .where("isActive", true)
      .first();

    if (!membership) {
      throw new NotFoundException("User is not a member of this team");
    }

    // Check permissions
    if (requestingUserId !== userId) {
      await this.verifyTeamLead(teamId, requestingUserId, hackathonId);
    }

    // If removing the lead, ensure there's another lead or this is the last member
    if (membership.role === TeamRole.LEAD) {
      const allMembers = await TeamRoster.query()
        .where("teamId", teamId)
        .where("hackathonId", hackathonId)
        .where("isActive", true);

      const otherMembers = allMembers.filter((m) => m.userId !== userId);

      if (otherMembers.length > 0) {
        const otherLeads = otherMembers.filter((m) => m.role === TeamRole.LEAD);
        if (otherLeads.length === 0) {
          throw new BadRequestException(
            "Cannot remove the only team lead. Promote another member first or disband the team.",
          );
        }
      }
    }

    // Remove the member (soft delete by setting isActive = false)
    await this.teamRosterRepo
      .patchOne(membership.id, { isActive: false })
      .exec();
  }

  async updateMemberRole(
    teamId: string,
    userId: string,
    data: UpdateMemberDto,
    hackathonId: string,
    requestingUserId: string,
  ): Promise<TeamRoster> {
    // Verify requesting user is team lead
    await this.verifyTeamLead(teamId, requestingUserId, hackathonId);

    const membership = await TeamRoster.query()
      .where("teamId", teamId)
      .where("userId", userId)
      .where("hackathonId", hackathonId)
      .where("isActive", true)
      .first();

    if (!membership) {
      throw new NotFoundException("User is not a member of this team");
    }

    // If promoting to lead, ensure only one lead rule
    if (data.role === TeamRole.LEAD && membership.role !== TeamRole.LEAD) {
      const currentMembers = await TeamRoster.query()
        .where("teamId", teamId)
        .where("hackathonId", hackathonId)
        .where("isActive", true);

      const currentLeads = currentMembers.filter(
        (m) => m.role === TeamRole.LEAD,
      );
      if (currentLeads.length >= 1) {
        throw new BadRequestException(
          "Team can only have one lead. Demote the current lead first.",
        );
      }
    }

    // If demoting the only lead, ensure there will be another lead
    if (membership.role === TeamRole.LEAD && data.role !== TeamRole.LEAD) {
      const allMembers = await TeamRoster.query()
        .where("teamId", teamId)
        .where("hackathonId", hackathonId)
        .where("isActive", true);

      const otherLeads = allMembers.filter(
        (m) => m.userId !== userId && m.role === TeamRole.LEAD,
      );
      if (otherLeads.length === 0 && allMembers.length > 1) {
        throw new BadRequestException(
          "Cannot demote the only team lead. Promote another member first.",
        );
      }
    }

    const updatedMember = await this.teamRosterRepo
      .patchOne(membership.id, { role: data.role })
      .exec();

    return updatedMember;
  }

  async getUserTeam(
    userId: string,
    hackathonId: string,
  ): Promise<TeamRoster[]> {
    const membership = await TeamRoster.query()
      .where("userId", userId)
      .where("hackathonId", hackathonId)
      .where("isActive", true)
      .first();

    if (!membership) {
      return [];
    }

    return this.getTeamRoster(membership.teamId, hackathonId);
  }

  private async verifyTeamLead(
    teamId: string,
    userId: string,
    hackathonId: string,
  ): Promise<void> {
    const membership = await TeamRoster.query()
      .where("teamId", teamId)
      .where("userId", userId)
      .where("hackathonId", hackathonId)
      .where("isActive", true)
      .where("role", TeamRole.LEAD)
      .first();

    if (!membership) {
      throw new BadRequestException("Only team leads can perform this action");
    }
  }

  private generateTeamId(): string {
    // Generate a 26-character team ID (similar to Stripe IDs)
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let result = "team_";
    for (let i = 0; i < 21; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}
