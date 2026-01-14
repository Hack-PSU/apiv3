import { Module } from "@nestjs/common";
import { ObjectionModule } from "common/objection";
import { Registration } from "entities/registration.entity";
import { RegistrationReview } from "entities/registration-review.entity";
import { ReviewerStats } from "entities/reviewer-stats.entity";
import { RegistrationController } from "./registration.controller";

@Module({
  imports: [
    ObjectionModule.forFeature([
      Registration,
      RegistrationReview,
      ReviewerStats,
    ]),
  ],
  controllers: [RegistrationController],
})
export class RegistrationModule {}