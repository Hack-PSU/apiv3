import {
  Injectable,
  HttpException,
  HttpStatus,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository, Repository } from "common/objection";
import { TeamRoster, TeamRole } from "entities/team-roster.entity";
import { User } from "entities/user.entity";
import { Hackathon } from "entities/hackathon.entity";
import { v4 as uuid } from "uuid";

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(TeamRoster)
    private readonly teamRosterRepo: Repository<TeamRoster>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async createTeam(userId: string, teamName: string): Promise<TeamRoster> {
    // Get active hackathon
    const hackathon = await Hackathon.query().findOne({ active: true });
    if (!hackathon) {
      throw new NotFoundException("No active hackathon found");
    }

    // Check if user already has a team for this hackathon
    const existingMembership = await this.teamRosterRepo
      .findAll()
      .byHackathon(hackathon.id)
      .where("userId", userId)
      .first();

    if (existingMembership) {
      throw new HttpException(
        "User already has a team for this hackathon",
        HttpStatus.CONFLICT,
      );
    }

    const teamId = uuid();
    const now = Date.now();

    return this.teamRosterRepo
      .createOne({
        id: uuid(),
        hackathonId: hackathon.id,
        teamId,
        teamName,
        userId,
        role: TeamRole.LEAD,
        joinedAt: now,
        updatedAt: now,
      })
      .byHackathon(hackathon.id);
  }

  async addMemberByEmail(
    teamId: string,
    userEmail: string,
  ): Promise<TeamRoster> {
    // Get active hackathon
    const hackathon = await Hackathon.query().findOne({ active: true });
    if (!hackathon) {
      throw new NotFoundException("No active hackathon found");
    }

    // Find user by email
    const user = await this.userRepo
      .findAll()
      .raw()
      .where("email", userEmail)
      .first();

    if (!user) {
      throw new NotFoundException("User with this email not found");
    }

    // Check if user already has a team for this hackathon
    const existingMembership = await this.teamRosterRepo
      .findAll()
      .byHackathon(hackathon.id)
      .where("userId", user.id)
      .first();

    if (existingMembership) {
      throw new HttpException(
        "User already has a team for this hackathon",
        HttpStatus.CONFLICT,
      );
    }

    // Check team size cap and get team info
    const currentMembers = await this.teamRosterRepo
      .findAll()
      .byHackathon(hackathon.id)
      .where("teamId", teamId);

    if (currentMembers.length >= 5) {
      throw new HttpException(
        "Team is full (max 5 members)",
        HttpStatus.CONFLICT,
      );
    }

    // Get team name from existing members
    const teamName = currentMembers[0]?.teamName;
    if (!teamName) {
      throw new HttpException("Team not found", HttpStatus.NOT_FOUND);
    }

    const now = Date.now();

    return this.teamRosterRepo
      .createOne({
        id: uuid(),
        hackathonId: hackathon.id,
        teamId,
        teamName,
        userId: user.id,
        role: TeamRole.MEMBER,
        joinedAt: now,
        updatedAt: now,
      })
      .byHackathon(hackathon.id);
  }

  async makeTeamLead(teamId: string, newLeadUserId: string): Promise<void> {
    // Get active hackathon
    const hackathon = await Hackathon.query().findOne({ active: true });
    if (!hackathon) {
      throw new NotFoundException("No active hackathon found");
    }

    const team = this.teamRosterRepo
      .findAll()
      .byHackathon(hackathon.id)
      .where("teamId", teamId);

    // Verify new lead is a member of this team
    const newLead = await team.clone().where("userId", newLeadUserId).first();

    if (!newLead) {
      throw new HttpException(
        "User is not a member of this team",
        HttpStatus.BAD_REQUEST,
      );
    }

    const trx = await TeamRoster.startTransaction();

    try {
      // Set current lead to member
      await TeamRoster.query()
        .where("hackathonId", hackathon.id)
        .where("teamId", teamId)
        .where("role", TeamRole.LEAD)
        .patch({ role: TeamRole.MEMBER, updatedAt: Date.now() })
        .transacting(trx);

      // Set new lead
      await TeamRoster.query()
        .where("hackathonId", hackathon.id)
        .where("teamId", teamId)
        .where("userId", newLeadUserId)
        .patch({ role: TeamRole.LEAD, updatedAt: Date.now() })
        .transacting(trx);

      await trx.commit();
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  async removeMember(userId: string): Promise<number> {
    // Get active hackathon
    const hackathon = await Hackathon.query().findOne({ active: true });
    if (!hackathon) {
      throw new NotFoundException("No active hackathon found");
    }

    const deleted = await TeamRoster.query()
      .where("hackathonId", hackathon.id)
      .where("userId", userId)
      .delete();

    if (deleted === 0) {
      throw new HttpException(
        "User not found in any team",
        HttpStatus.NOT_FOUND,
      );
    }

    return deleted;
  }

  async transferUser(
    userId: string,
    newTeamId: string,
    newTeamName: string,
  ): Promise<TeamRoster> {
    // Get active hackathon
    const hackathon = await Hackathon.query().findOne({ active: true });
    if (!hackathon) {
      throw new NotFoundException("No active hackathon found");
    }

    // Check if target team exists and has space
    const targetTeamMembers = await this.teamRosterRepo
      .findAll()
      .byHackathon(hackathon.id)
      .where("teamId", newTeamId);

    if (targetTeamMembers.length >= 5) {
      throw new HttpException("Target team is full", HttpStatus.CONFLICT);
    }

    const updated = await TeamRoster.query()
      .where("hackathonId", hackathon.id)
      .where("userId", userId)
      .patch({
        teamId: newTeamId,
        teamName: newTeamName,
        role: TeamRole.MEMBER,
        updatedAt: Date.now(),
      });

    if (updated === 0) {
      throw new HttpException("User not found", HttpStatus.NOT_FOUND);
    }

    return this.teamRosterRepo
      .findAll()
      .byHackathon(hackathon.id)
      .where("userId", userId)
      .first();
  }

  async renameTeam(teamId: string, newTeamName: string): Promise<number> {
    // Get active hackathon
    const hackathon = await Hackathon.query().findOne({ active: true });
    if (!hackathon) {
      throw new NotFoundException("No active hackathon found");
    }

    const updated = await TeamRoster.query()
      .where("hackathonId", hackathon.id)
      .where("teamId", teamId)
      .patch({
        teamName: newTeamName,
        updatedAt: Date.now(),
      });

    if (updated === 0) {
      throw new HttpException("Team not found", HttpStatus.NOT_FOUND);
    }

    return updated;
  }

  async deleteTeam(teamId: string): Promise<number> {
    // Get active hackathon
    const hackathon = await Hackathon.query().findOne({ active: true });
    if (!hackathon) {
      throw new NotFoundException("No active hackathon found");
    }

    const deleted = await TeamRoster.query()
      .where("hackathonId", hackathon.id)
      .where("teamId", teamId)
      .delete();

    if (deleted === 0) {
      throw new HttpException("Team not found", HttpStatus.NOT_FOUND);
    }

    return deleted;
  }

  // Query methods
  async getUserTeam(userId: string): Promise<TeamRoster | null> {
    // Get active hackathon
    const hackathon = await Hackathon.query().findOne({ active: true });
    if (!hackathon) {
      throw new NotFoundException("No active hackathon found");
    }

    return (
      this.teamRosterRepo
        .findAll()
        .byHackathon(hackathon.id)
        .where("userId", userId)
        .withGraphFetched("user")
        .first() || null
    );
  }

  async getTeamRoster(teamId: string): Promise<TeamRoster[]> {
    // Get active hackathon
    const hackathon = await Hackathon.query().findOne({ active: true });
    if (!hackathon) {
      throw new NotFoundException("No active hackathon found");
    }

    return this.teamRosterRepo
      .findAll()
      .byHackathon(hackathon.id)
      .where("teamId", teamId)
      .withGraphFetched("user")
      .orderByRaw("CASE WHEN role = 'lead' THEN 0 ELSE 1 END, joined_at");
  }

  async getTeamsOverview() {
    // Get active hackathon
    const hackathon = await Hackathon.query().findOne({ active: true });
    if (!hackathon) {
      throw new NotFoundException("No active hackathon found");
    }

    const results = await TeamRoster.query()
      .where("hackathonId", hackathon.id)
      .select("teamId", "teamName")
      .count("* as members")
      .groupBy("teamId", "teamName");

    return results.map((row: any) => ({
      teamId: row.teamId,
      teamName: row.teamName,
      members: parseInt(row.members),
    }));
  }
}
