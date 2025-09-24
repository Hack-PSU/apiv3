import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  UseFilters,
  ValidationPipe,
} from "@nestjs/common";
import { ApiTags, ApiProperty, OmitType } from "@nestjs/swagger";
import { ReservationService, ReservationFilters } from "./reservation.service";
import {
  ReservationEntity,
  ReservationType,
  ReservationStatus,
} from "entities/reservation.entity";
import { Role, Roles } from "common/gcp";
import { ApiDoc } from "common/docs";
import { DBExceptionFilter } from "common/filters";
import { IsString, IsNumber, IsOptional, IsEnum } from "class-validator";
import { Type } from "class-transformer";
import { isNumber } from "lodash";

class CreateReservationEntity {
  @ApiProperty()
  @IsNumber()
  @Type(() => Number)
  locationId: number;

  @ApiProperty()
  @IsString()
  teamId: string;

  @ApiProperty()
  @IsNumber()
  @Type(() => Number)
  startTime: number;

  @ApiProperty()
  @IsNumber()
  @Type(() => Number)
  endTime: number;

  @ApiProperty()
  @IsString()
  hackathonId: string;
}

class CreateBlackoutEntity {
  @ApiProperty()
  @IsNumber()
  @Type(() => Number)
  locationId: number;

  @ApiProperty()
  @IsNumber()
  @Type(() => Number)
  startTime: number;

  @ApiProperty()
  @IsNumber()
  @Type(() => Number)
  endTime: number;

  @ApiProperty()
  @IsString()
  hackathonId: string;
}

class CancelReservationEntity {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class UpdateReservationEntity {

  @ApiProperty()
  @IsNumber()
  @Type(() => Number)
  reservationId: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  startTime?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  endTime?: number;

}

class ReservationQueryParams {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  locationId?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  teamId?: string;

  @ApiProperty({ required: false, enum: ReservationStatus })
  @IsOptional()
  @IsEnum(ReservationStatus)
  status?: ReservationStatus;

  @ApiProperty({ required: false, enum: ReservationType })
  @IsOptional()
  @IsEnum(ReservationType)
  type?: ReservationType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  from?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  to?: number;

  @ApiProperty()
  @IsString()
  hackathonId: string;
}

class AdminReservationQueryParams extends OmitType(
  ReservationQueryParams,
  [] as const,
) {}

@ApiTags("Reservations")
@Controller("reservations")
@UseFilters(DBExceptionFilter)
export class ReservationController {
  constructor(private readonly reservationService: ReservationService) {}

  @Get("/")
  @ApiDoc({
    summary: "Get Reservations for Location/Time Window",
    response: {
      ok: { type: [ReservationEntity] },
    },
  })
  async getReservations(
    @Query(new ValidationPipe({ transform: true }))
    query: ReservationQueryParams,
  ) {
    const filters: ReservationFilters = {
      locationId: query.locationId,
      from: query.from,
      to: query.to,
      status: ReservationStatus.CONFIRMED, // Public endpoint only shows confirmed
      type: ReservationType.TEAM, // Public endpoint doesn't show blackouts
    };

    return this.reservationService.getReservations(filters, query.hackathonId);
  }

  @Get("/all")
  @Roles(Role.TEAM)
  @ApiDoc({
    summary: "Get All Reservations (Admin Only)",
    response: {
      ok: { type: [ReservationEntity] },
    },
    auth: Role.TEAM,
  })
  async getAllReservations(
    @Query(new ValidationPipe({ transform: true }))
    query: AdminReservationQueryParams,
  ) {
    const filters: ReservationFilters = {
      locationId: query.locationId,
      teamId: query.teamId,
      status: query.status,
      type: query.type,
      from: query.from,
      to: query.to,
    };

    return this.reservationService.getReservations(filters, query.hackathonId);
  }

  @Post("/")
  @ApiDoc({
    summary: "Create Team Reservation",
    request: {
      body: { type: CreateReservationEntity },
      validate: true,
    },
    response: {
      created: { type: ReservationEntity },
    },
  })
  async createReservation(
    @Body(new ValidationPipe({ transform: true }))
    data: CreateReservationEntity,
    @Req() req: any,
  ) {
    return this.reservationService.createReservation(data, req.user?.sub);
  }

  @Post("/blackout")
  @Roles(Role.TEAM)
  @ApiDoc({
    summary: "Create Blackout Period (Admin Only)",
    request: {
      body: { type: CreateBlackoutEntity },
      validate: true,
    },
    response: {
      created: { type: ReservationEntity },
    },
    auth: Role.TEAM,
  })
  async createBlackout(
    @Body(new ValidationPipe({ transform: true })) data: CreateBlackoutEntity,
    @Req() req: any,
  ) {
    return this.reservationService.createBlackout(data, req.user?.sub);
  }

  @Delete("/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiDoc({
    summary: "Cancel Reservation",
    params: [
      {
        name: "id",
        description: "Reservation ID",
      },
    ],
    request: {
      body: { type: CancelReservationEntity },
      validate: true,
    },
    response: {
      noContent: true,
    },
  })
  async cancelReservation(
    @Param("id") reservationId: string,
    @Body(new ValidationPipe({ transform: true }))
    data: CancelReservationEntity,
    @Req() req: any,
  ) {
    await this.reservationService.cancelReservation(
      reservationId,
      req.user?.sub,
      data.reason,
    );
  }

  @Delete("/blackout/:id")
  @Roles(Role.TEAM)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiDoc({
    summary: "Cancel Blackout Period (Admin Only)",
    params: [
      {
        name: "id",
        description: "Blackout ID",
      },
    ],
    request: {
      body: { type: CancelReservationEntity },
      validate: true,
    },
    response: {
      noContent: true,
    },
    auth: Role.TEAM,
  })
  async cancelBlackout(
    @Param("id") blackoutId: string,
    @Body(new ValidationPipe({ transform: true }))
    data: CancelReservationEntity,
    @Req() req: any,
  ) {
    await this.reservationService.cancelReservation(
      blackoutId,
      req.user?.sub,
      data.reason,
    );
  }
}