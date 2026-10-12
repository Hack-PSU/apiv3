import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository, Repository } from "common/objection";
import { Registration } from "entities/registration.entity";
import { User } from "entities/user.entity";
import { UserService } from "modules/user/user.service";
import {
  ApplicantEvaluationInput,
  ApplicantEvaluationResume,
} from "./applicant-evaluation-input.types";

@Injectable()
export class ApplicantEvaluationInputService {
  constructor(
    @InjectRepository(Registration)
    private readonly registrationRepo: Repository<Registration>,
    private readonly userService: UserService,
  ) {}

  async build(
    hackathonId: string,
    userId: string,
  ): Promise<ApplicantEvaluationInput> {
    const registration: (Registration & { user?: User }) | undefined =
      await this.registrationRepo
        .findAll()
        .raw()
        .where({ hackathonId, userId })
        .withGraphFetched("user")
        .first();

    if (!registration) {
      throw new NotFoundException(
        `Registration not found for userId: ${userId}, hackathonId: ${hackathonId}`,
      );
    }

    const { user } = registration;
    if (!user) {
      throw new NotFoundException(`User not found for userId: ${userId}`);
    }

    return {
      hackathonId,
      userId,
      project: registration.project,
      expectations: registration.expectations,
      excitement: registration.excitement,
      codingExperience: registration.codingExperience,
      academicYear: registration.academicYear,
      major: user.major,
      university: user.university,
      resume: user.resume ? await this.loadResume(userId) : null,
    };
  }

  private async loadResume(
    userId: string,
  ): Promise<ApplicantEvaluationResume | null> {
    try {
      const buffer = await this.userService.downloadResume(userId);
      return {
        mimeType: "application/pdf",
        base64Data: buffer.toString("base64"),
      };
    } catch (error) {
      // A user record can still point at a resume that was removed from the
      // bucket.
      if (error?.code === 404) {
        return null;
      }
      throw error;
    }
  }
}
