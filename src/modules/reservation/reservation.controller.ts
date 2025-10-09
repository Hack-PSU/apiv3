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
  UnauthorizedException,
  UseFilters,
  ValidationPipe,
} from "@nestjs/common";
import { ApiTags, ApiProperty } from "@nestjs/swagger";
import { ReservationService } from "./reservation.service";
import { ReservationEntity } from "entities/reservation.entity";
import { ApiDoc } from "common/docs";
import { DBExceptionFilter } from "common/filters";
import { IsString, IsNumber, IsOptional } from "class-validator";
import { Type } from "class-transformer";
import { Role, Roles } from "common/gcp";

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

export class UpdateReservationEntity {
  @ApiProperty()
  @IsString()
  reservationId: string;

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

@ApiTags("Reservations")
@Controller("reservations")
@UseFilters(DBExceptionFilter)
export class ReservationController {
  constructor(private readonly reservationService: ReservationService) {}

  @Get("/")
  @Roles(Role.NONE)
  @ApiDoc({
    summary: "Get All Reservations",
    response: {
      ok: { type: [ReservationEntity] },
    },
  })
  async getReservations() {
    return this.reservationService.getReservations();
  }

  @Post("/")
  @Roles(Role.NONE)
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
    if (!req.user || !("sub" in req.user)) {
      throw new UnauthorizedException();
    }

    const userId = String(req.user.sub);
    return await this.reservationService.createReservation(data, userId);
  }

  @Delete("/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(Role.TEAM)
  @ApiDoc({
    summary: "Cancel Reservation",
    params: [
      {
        name: "id",
        description: "Reservation ID",
      },
    ],
    response: {
      noContent: true,
    },
  })
  async cancelReservation(@Param("id") reservationId: string, @Req() req: any) {
    if (!req.user || !("sub" in req.user)) {
      throw new UnauthorizedException();
    }

    const userId = String(req.user.sub);
    await this.reservationService.cancelReservation(reservationId, userId);
  }
}
