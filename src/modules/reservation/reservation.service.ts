import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository, Repository } from "common/objection";
import {
  Reservation,
  ReservationType,
  ReservationStatus,
} from "entities/reservation.entity";
import {
  ReservationAudit,
  ReservationAuditAction,
} from "entities/reservation-audit.entity";
import { Location } from "entities/location.entity";
import { Hackathon } from "entities/hackathon.entity";
import { TeamRoster, TeamRole } from "entities/team-roster.entity";
import { v4 as uuidv4 } from "uuid";

export interface CreateReservationDto {
  locationId: number;
  teamId: string;
  startTime: number;
  endTime: number;
  hackathonId: string;
}

export interface CreateBlackoutDto {
  locationId: number;
  startTime: number;
  endTime: number;
  hackathonId: string;
}

export interface ReservationFilters {
  locationId?: number;
  teamId?: string;
  status?: ReservationStatus;
  type?: ReservationType;
  from?: number;
  to?: number;
}

@Injectable()
export class ReservationService {
  constructor(
    @InjectRepository(Reservation)
    private readonly reservationRepo: Repository<Reservation>,
    @InjectRepository(ReservationAudit)
    private readonly auditRepo: Repository<ReservationAudit>,
    @InjectRepository(Location)
    private readonly locationRepo: Repository<Location>,
    @InjectRepository(Hackathon)
    private readonly hackathonRepo: Repository<Hackathon>,
    @InjectRepository(TeamRoster)
    private readonly teamRosterRepo: Repository<TeamRoster>,
  ) {}

  async createReservation(
    data: CreateReservationDto,
    createdByUserId: string,
  ): Promise<Reservation> {
    // Validate the reservation
    await this.validateReservation(data, createdByUserId);

    const reservation = await this.reservationRepo
      .createOne({
        id: uuidv4(),
        ...data,
        type: ReservationType.TEAM,
        status: ReservationStatus.CONFIRMED,
        createdByUserId,
        createdAt: Date.now(),
        canceledAt: null,
        cancelReason: null,
      })
      .exec();

    // Create audit record
    await this.createAuditRecord(
      reservation.id,
      createdByUserId,
      ReservationAuditAction.CREATE,
      { reservation },
    );

    return reservation;
  }

  async createBlackout(
    data: CreateBlackoutDto,
    createdByUserId: string,
  ): Promise<Reservation> {
    // Validate basic constraints (hackathon bounds, location exists)
    await this.validateBasicConstraints(data);

    const blackout = await this.reservationRepo
      .createOne({
        id: uuidv4(),
        ...data,
        teamId: null,
        type: ReservationType.BLACKOUT,
        status: ReservationStatus.CONFIRMED,
        createdByUserId,
        createdAt: Date.now(),
        canceledAt: null,
        cancelReason: null,
      })
      .exec();

    // Create audit record
    await this.createAuditRecord(
      blackout.id,
      createdByUserId,
      ReservationAuditAction.CREATE,
      { blackout },
    );

    return blackout;
  }

  async cancelReservation(
    reservationId: string,
    canceledByUserId: string,
    reason?: string,
  ): Promise<Reservation> {
    const reservation = await this.reservationRepo
      .findOne(reservationId)
      .exec();
    if (!reservation) {
      throw new NotFoundException("Reservation not found");
    }

    if (reservation.status === ReservationStatus.CANCELED) {
      throw new BadRequestException("Reservation is already canceled");
    }

    // Check if user can cancel this reservation
    await this.checkCancelPermission(reservation, canceledByUserId);

    const updatedReservation = await this.reservationRepo
      .patchOne(reservationId, {
        status: ReservationStatus.CANCELED,
        canceledAt: Date.now(),
        cancelReason: reason || null,
      })
      .exec();

    // Create audit record
    await this.createAuditRecord(
      reservationId,
      canceledByUserId,
      ReservationAuditAction.CANCEL,
      { reason, originalReservation: reservation },
    );

    return updatedReservation;
  }

  async getReservations(
    filters: ReservationFilters,
    hackathonId: string,
  ): Promise<Reservation[]> {
    let query = Reservation.query().where("hackathonId", hackathonId);

    if (filters.locationId) {
      query = query.where("locationId", filters.locationId);
    }

    if (filters.teamId) {
      query = query.where("teamId", filters.teamId);
    }

    if (filters.status) {
      query = query.where("status", filters.status);
    }

    if (filters.type) {
      query = query.where("type", filters.type);
    }

    if (filters.from) {
      query = query.where("endTime", ">", filters.from);
    }

    if (filters.to) {
      query = query.where("startTime", "<", filters.to);
    }

    return query.orderBy("startTime", "asc");
  }

  private async validateReservation(
    data: CreateReservationDto,
    createdByUserId: string,
  ): Promise<void> {
    // 1. Validate basic constraints (hackathon bounds, location exists, duration)
    await this.validateBasicConstraints(data);

    // 2. Validate team constraints
    await this.validateTeamConstraints(
      data.teamId,
      createdByUserId,
      data.hackathonId,
    );

    // 3. Check for conflicts (blackouts, capacity, team double booking)
    await this.checkConflicts(data);
  }

  private async validateBasicConstraints(data: {
    locationId: number;
    startTime: number;
    endTime: number;
    hackathonId: string;
  }): Promise<void> {
    // Get hackathon bounds
    const hackathon = await this.hackathonRepo.findOne(data.hackathonId).exec();
    if (!hackathon) {
      throw new NotFoundException("Hackathon not found");
    }

    // Validate time is within hackathon bounds
    if (
      data.startTime < hackathon.startTime ||
      data.endTime > hackathon.endTime
    ) {
      throw new BadRequestException(
        "Reservation must be within hackathon timeframe",
      );
    }

    if (data.startTime >= data.endTime) {
      throw new BadRequestException("Start time must be before end time");
    }

    // Get location and validate
    const location = await Location.query()
      .findById(data.locationId)
      .where("hackathonId", data.hackathonId)
      .first();

    if (!location) {
      throw new NotFoundException("Location not found");
    }

    if (!location.isBookable) {
      throw new BadRequestException("Location is not bookable");
    }

    // Validate duration
    const durationMins = (data.endTime - data.startTime) / (1000 * 60);
    if (
      durationMins < location.minReservationMins ||
      durationMins > location.maxReservationMins
    ) {
      throw new BadRequestException(
        `Reservation duration must be between ${location.minReservationMins} and ${location.maxReservationMins} minutes`,
      );
    }
  }

  private async validateTeamConstraints(
    teamId: string,
    userId: string,
    hackathonId: string,
  ): Promise<void> {
    // Check if user is part of the team
    const membership = await TeamRoster.query()
      .where("teamId", teamId)
      .where("userId", userId)
      .where("hackathonId", hackathonId)
      .where("isActive", true)
      .first();

    if (!membership) {
      throw new ForbiddenException("User is not a member of this team");
    }

    // Only team leads can create reservations
    if (membership.role !== TeamRole.LEAD) {
      throw new ForbiddenException("Only team leads can create reservations");
    }

    // Verify team has valid roster (≤ 5 members, exactly 1 lead)
    const teamMembers = await TeamRoster.query()
      .where("teamId", teamId)
      .where("hackathonId", hackathonId)
      .where("isActive", true);

    if (teamMembers.length > 5) {
      throw new BadRequestException("Team has too many members (max 5)");
    }

    const leadCount = teamMembers.filter(
      (m) => m.role === TeamRole.LEAD,
    ).length;
    if (leadCount !== 1) {
      throw new BadRequestException("Team must have exactly one lead");
    }
  }

  private async checkConflicts(data: CreateReservationDto): Promise<void> {
    const location = await this.locationRepo.findOne(data.locationId).exec();

    // Expand window by buffer for conflict checks
    const bufferMs = location.bufferMins * 60 * 1000;
    const checkStartTime = data.startTime - bufferMs;
    const checkEndTime = data.endTime + bufferMs;

    // 1. Check for blackouts
    const blackouts = await Reservation.query()
      .where("locationId", data.locationId)
      .where("type", ReservationType.BLACKOUT)
      .where("status", ReservationStatus.CONFIRMED)
      .where("hackathonId", data.hackathonId)
      .where(function (this) {
        this.where(function (this) {
          this.where("startTime", "<", data.endTime).where(
            "endTime",
            ">",
            data.startTime,
          );
        });
      });

    if (blackouts.length > 0) {
      throw new BadRequestException(
        "Time slot conflicts with a blackout period",
      );
    }

    // 2. Check room capacity (by teams)
    const overlappingReservations = await Reservation.query()
      .where("locationId", data.locationId)
      .where("type", ReservationType.TEAM)
      .where("status", ReservationStatus.CONFIRMED)
      .where("hackathonId", data.hackathonId)
      .where(function (this) {
        this.where(function (this) {
          this.where("startTime", "<", checkEndTime).where(
            "endTime",
            ">",
            checkStartTime,
          );
        });
      });

    if (overlappingReservations.length >= location.teamCapacity) {
      throw new BadRequestException("Room is at capacity for this time slot");
    }

    // 3. Check team double booking (team can't have multiple reservations)
    const teamConflicts = await Reservation.query()
      .where("teamId", data.teamId)
      .where("type", ReservationType.TEAM)
      .where("status", ReservationStatus.CONFIRMED)
      .where("hackathonId", data.hackathonId)
      .where(function (this) {
        this.where(function (this) {
          this.where("startTime", "<", data.endTime).where(
            "endTime",
            ">",
            data.startTime,
          );
        });
      });

    if (teamConflicts.length > 0) {
      throw new BadRequestException(
        "Team already has a reservation during this time",
      );
    }
  }

  private async checkCancelPermission(
    reservation: Reservation,
    userId: string,
  ): Promise<void> {
    // Creator can always cancel
    if (reservation.createdByUserId === userId) {
      return;
    }

    // Team lead can cancel team reservations
    if (reservation.type === ReservationType.TEAM && reservation.teamId) {
      const membership = await TeamRoster.query()
        .where("teamId", reservation.teamId)
        .where("userId", userId)
        .where("hackathonId", reservation.hackathonId)
        .where("isActive", true)
        .where("role", TeamRole.LEAD)
        .first();

      if (membership) {
        return;
      }
    }

    throw new ForbiddenException(
      "User does not have permission to cancel this reservation",
    );
  }

  private async createAuditRecord(
    reservationId: string,
    actorUserId: string,
    action: ReservationAuditAction,
    meta: any = null,
  ): Promise<void> {
    await this.auditRepo
      .createOne({
        id: uuidv4(),
        reservationId,
        actorUserId,
        action,
        meta: meta ? JSON.stringify(meta) : null,
        createdAt: Date.now(),
      })
      .exec();
  }
}
