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

class ReservationQueryParams {
  @ApiProperty()
  @IsString()
  hackathonId: string;
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
  async getReservations(
    @Query(new ValidationPipe({ transform: true }))
    query: ReservationQueryParams,
  ) {
    return this.reservationService.getReservations(query.hackathonId);
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
    return this.reservationService.createReservation(data, req.user?.sub);
  }

  @Delete("/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(Role.NONE)
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
    await this.reservationService.cancelReservation(
      reservationId,
      req.user?.sub,
    );
  }
}
