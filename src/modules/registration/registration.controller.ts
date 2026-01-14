import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  ValidationPipe,
} from "@nestjs/common";
import { InjectRepository, Repository } from "common/objection";
import {
  Registration,
  RegistrationEntity,
  RegistrationGrade,
  RegistrationReviewStatus,
} from "entities/registration.entity";
import { RegistrationReview } from "entities/registration-review.entity";
import { ReviewerStats } from "entities/reviewer-stats.entity";
import { ApiProperty, ApiTags } from "@nestjs/swagger";
import { Role, Roles } from "common/gcp";
import { ApiDoc } from "common/docs";
import { IsBoolean, IsEnum, IsOptional, IsString } from "class-validator";import { Transform } from "class-transformer";
import { Request } from "express";


class ActiveRegistrationParams {
  @ApiProperty()
  @IsOptional()
  @IsBoolean()
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
  all?: boolean;
}

class GradeRegistrationDto {
  @ApiProperty({ enum: RegistrationGrade })
  @IsEnum(RegistrationGrade)
  grade: RegistrationGrade;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  review_notes?: string;
}

@ApiTags("Registrations")
@Controller("registrations")
export class RegistrationController {
  constructor(
    @InjectRepository(Registration)
    private readonly registrationRepo: Repository<Registration>,
    @InjectRepository(RegistrationReview)
    private readonly registrationReviewRepo: Repository<RegistrationReview>,
    @InjectRepository(ReviewerStats)
    private readonly reviewerStatsRepo: Repository<ReviewerStats>,
  ) {}

  @Get("/")
  @Roles(Role.TEAM)
  @ApiDoc({
    summary: "Get All Registrations",
    auth: Role.TEAM,
    query: [
      {
        name: "all",
        type: "boolean",
        required: false,
        description: "Set all to true to return all registrations.",
      },
    ],
    response: {
      ok: { type: [RegistrationEntity] },
    },
  })
  async getAll(
    @Query(new ValidationPipe({ transform: true }))
    { all }: ActiveRegistrationParams,
  ) {
    if (all) {
      return this.registrationRepo.findAll().exec();
    } else {
      return this.registrationRepo.findAll().byHackathon();
    }
  }
@Post("/:id/grade")
  @Roles(Role.TEAM)
  @ApiDoc({
    summary: "Grade a Registration",
    auth: Role.TEAM,
    params: [
      {
        name: "id",
        description: "ID of the registration to grade",
      },
    ],
    request: {
      body: { type: GradeRegistrationDto },
      validate: true,
    },
    response: {
      ok: { type: RegistrationEntity },
    },
  })
  async gradeRegistration(
    @Param("id", ParseIntPipe) id: number,
    @Body(new ValidationPipe()) data: GradeRegistrationDto,
    @Req() req: Request,
  ) {
    if (!req.user || !("sub" in req.user)) {
      throw new HttpException(
        "Could not identify reviewer",
        HttpStatus.UNAUTHORIZED,
      );
    }
    const reviewerId = (req.user as any).sub;

    const registration = await this.registrationRepo.findOne(id).exec();

    if (!registration) {
      throw new HttpException("Registration not found", HttpStatus.NOT_FOUND);
    }

    if (registration.reviewStatus !== RegistrationReviewStatus.IN_REVIEW) {
      throw new HttpException(
        "Registration must be in 'in_review' status to be graded",
        HttpStatus.BAD_REQUEST,
      );
    }

    // 1. Update registration
    const updatedRegistration = await this.registrationRepo
      .patchOne(id, {
        reviewStatus: RegistrationReviewStatus.GRADED,
        grade: data.grade,
        gradedBy: reviewerId,
      })
      .exec();

    // 2. Create registration_reviews record
    await this.registrationReviewRepo
      .createOne({
        registrationId: id,
        reviewerId: reviewerId,
        grade: data.grade,
        reviewNotes: data.review_notes,
      })
      .exec();

    // 3. Increment reviewer's total_reviewed in reviewer_stats
    const stats = await this.reviewerStatsRepo.findOne(reviewerId).exec();

    if (stats) {
      await this.reviewerStatsRepo
        .patchOne(reviewerId, {
          totalReviewed: stats.totalReviewed + 1,
        })
        .exec();
    } else {
      await this.reviewerStatsRepo
        .createOne({
          reviewerId: reviewerId,
          totalReviewed: 1,
        })
        .exec();
    }

    return updatedRegistration;
  }
}