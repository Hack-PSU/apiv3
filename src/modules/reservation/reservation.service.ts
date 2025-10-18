import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository, Repository } from "common/objection";
import { Reservation, ReservationType } from "entities/reservation.entity";
import { Location } from "entities/location.entity";
import { Hackathon } from "entities/hackathon.entity";
import { Team } from "entities/team.entity";
import { Organizer } from "entities/organizer.entity";
import { Role } from "common/gcp";
import { FirebaseAuthService } from "common/gcp";
import { v4 as uuidv4 } from "uuid";
import { nanoid } from "nanoid";

export interface UpdateReservationDto {
  reservationID: string;
  startTime?: number;
  endTime?: number;
}

export interface CreateReservationDto {
  locationId: number;
  teamId: string;
  startTime: number;
  endTime: number;
  hackathonId: string;
}

@Injectable()
export class ReservationService {
  constructor(
    @InjectRepository(Reservation)
    private readonly reservationRepo: Repository<Reservation>,
    @InjectRepository(Location)
    private readonly locationRepo: Repository<Location>,
    @InjectRepository(Hackathon)
    private readonly hackathonRepo: Repository<Hackathon>,
    @InjectRepository(Team)
    private readonly teamRepo: Repository<Team>,
    @InjectRepository(Organizer)
    private readonly organizerRepo: Repository<Organizer>,
    private readonly firebaseAuthService: FirebaseAuthService,
  ) {}

  async getActiveHackathonId(): Promise<string> {
    const hackathon = await Hackathon.query().findOne({ active: true });
    if (!hackathon) {
      throw new NotFoundException("Active hackathon not found");
    }
    return hackathon.id;
  }

  async createReservation(
    data: CreateReservationDto,
    userId: string,
  ): Promise<Reservation> {
    // Check if user is an organizer
    const isOrganizer = await this.isUserOrganizer(userId);

    // If not an organizer, validate team constraints
    console.log("isOrganizer:", isOrganizer);
    if (!isOrganizer) {
      console.log("validating reservation for user:", userId);
      await this.validateReservation(data, userId);
    } else {
      console.log("organizer creating reservation");
      // For organizers, just validate basic constraints
      await this.validateBasicConstraints(data);
      console.log("validated basic constraints for organizer");
      await this.checkConflicts(data);
    }
    console.log("creating reservation:", data);

    const reservation = this.reservationRepo
      .createOne({
        locationId: data.locationId,
        teamId: data.teamId, // Organizer reservations are not team-specific
        startTime: data.startTime,
        endTime: data.endTime,
        hackathonId: data.hackathonId,
        reservationType: isOrganizer
          ? ReservationType.ADMIN
          : ReservationType.PARTICIPANT,
      })
      .byHackathon(data.hackathonId)
      .execute();
    console.log("created reservation:", reservation);

    return reservation;
  }

  async cancelReservation(
    reservationId: string,
    userId: string,
  ): Promise<void> {
    const reservation = await this.reservationRepo
      .findOne(reservationId)
      .exec();
    if (!reservation) {
      throw new NotFoundException("Reservation not found");
    }

    // Check if user is an organizer with EXEC or higher role
    const organizer = await this.organizerRepo.findOne(userId).exec();
    const userPrivilege =
      await this.firebaseAuthService.getUserPrivilegeFromUid(userId);
    const hasExecPrivileges =
      organizer && organizer.isActive && userPrivilege >= Role.EXEC;
    // If user has EXEC+ privileges, they can delete any reservation
    if (hasExecPrivileges) {
      await this.reservationRepo.deleteOne(reservationId).exec();
      return;
    }

    // For regular users, check if they are canceling their own team's reservation
    if (reservation.teamId) {
      const team = await this.teamRepo.findOne(reservation.teamId).exec();
      if (team) {
        const isUserInTeam = [
          team.member1,
          team.member2,
          team.member3,
          team.member4,
          team.member5,
        ].includes(userId);

        if (!isUserInTeam) {
          throw new ForbiddenException(
            "You can only cancel your own team's reservations",
          );
        }
      } else {
        throw new ForbiddenException(
          "You can only cancel your own team's reservations",
        );
      }
    } else {
      // This is an admin reservation with no team - only EXEC+ can delete
      throw new ForbiddenException("You cannot cancel this reservation");
    }

    // Delete the reservation
    await this.reservationRepo.deleteOne(reservationId).exec();
  }

  async updateReservation(
    data: UpdateReservationDto,
    userId: string,
  ): Promise<Reservation> {
    // Get the reservation
    const reservation = await this.reservationRepo
      .findOne(data.reservationID)
      .exec();

    if (!reservation) {
      throw new NotFoundException("Reservation not found");
    }

    // validate data
    const validationData = {
      locationId: reservation.locationId,
      teamId: reservation.teamId,
      startTime: data.startTime ? data.startTime : reservation.startTime,
      endTime: data.endTime ? data.endTime : reservation.endTime,
      hackathonId: reservation.hackathonId,
    };

    await this.validateReservation(validationData, userId);

    // patch with new start and end times
    const updatedReservation = await this.reservationRepo
      .patchOne(data.reservationID, {
        startTime: validationData.startTime,
        endTime: validationData.endTime,
      })
      .exec();

    return updatedReservation;
  }

  async getReservations(): Promise<Reservation[]> {
    const hackathonId = await this.getActiveHackathonId();
    return Reservation.query()
      .where("hackathonId", hackathonId)
      .orderBy("startTime", "asc");
  }

  private async validateReservation(
    data: CreateReservationDto,
    userId: string,
  ): Promise<void> {
    // 1. Validate basic constraints (hackathon bounds, location exists, duration)
    await this.validateBasicConstraints(data);

    // 2. Validate team constraints
    await this.validateTeamConstraints(data.teamId, userId, data.hackathonId);
    console.log("validated team constraints");

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

    // Get location and validate it exists
    const location = await this.locationRepo.findOne(data.locationId).exec();

    if (!location) {
      throw new NotFoundException("Location not found");
    }
    console.log("validated basic constraints");
  }

  private async validateTeamConstraints(
    teamId: string,
    userId: string,
    hackathonId: string,
  ): Promise<void> {
    // Check if team exists and is active
    const team = await this.teamRepo.findOne(teamId).exec();

    if (!team) {
      throw new NotFoundException("Team not found");
    }

    if (!team.isActive) {
      throw new BadRequestException("Team is not active");
    }

    if (team.hackathonId !== hackathonId) {
      throw new BadRequestException(
        "Team is not registered for this hackathon",
      );
    }

    // Check if user is a member of the team
    const isUserInTeam = [
      team.member1,
      team.member2,
      team.member3,
      team.member4,
      team.member5,
    ].includes(userId);

    if (!isUserInTeam) {
      throw new ForbiddenException("User is not a member of this team");
    }
  }

  private async checkConflicts(data: CreateReservationDto): Promise<void> {
    const location = await this.locationRepo.findOne(data.locationId).exec();
    if (!location) {
      throw new NotFoundException("Location not found");
    }

    // 1. Check room capacity (person-based, 0 = unlimited)
    if (location.capacity > 0) {
      // Get all overlapping reservations
      const overlappingReservations = await Reservation.query()
        .where("locationId", data.locationId)
        .where("reservationType", ReservationType.PARTICIPANT)
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

      // Count people in overlapping reservations
      // For simplicity, assume each reservation is for 1 person, effectively a team booking
      const currentOccupancy = overlappingReservations.length;

      if (currentOccupancy >= location.capacity) {
        throw new BadRequestException(
          `Location is at capacity (${location.capacity} people) for this time slot`,
        );
      }
    }
    // If capacity is 0, skip capacity check (unlimited)

    // 2. Check team double booking (team can't have multiple reservations)
    const teamConflicts = await Reservation.query()
      .where("teamId", data.teamId)
      .where("reservationType", ReservationType.PARTICIPANT)
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

    console.log("teamConflicts:", teamConflicts);

    if (teamConflicts.length > 0) {
      throw new BadRequestException(
        "Team already has a reservation during this time",
      );
    }
  }

  private async isUserOrganizer(userId: string): Promise<boolean> {
    const organizer = await this.organizerRepo.findOne(userId).exec();
    console.log("organizer:", organizer);
    return organizer !== null && organizer !== undefined && organizer.isActive;
  }
}
