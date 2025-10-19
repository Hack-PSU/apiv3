import { Injectable, BadRequestException } from "@nestjs/common";
import * as admin from "firebase-admin";
import { v4 as uuidv4 } from "uuid";
import {
  OrganizerApplication,
  ApplicationStatus,
  OrganizerTeam,
} from "entities/organizer-application.entity";
import { InjectRepository, Repository } from "common/objection";

@Injectable()
export class OrganizerApplicationService {
  private resumeBucketName = "hackpsu-organizer-applications";

  constructor(
    @InjectRepository(OrganizerApplication)
    private readonly applicationRepo: Repository<OrganizerApplication>,
  ) {}

  private get resumeBucket() {
    return admin.storage().bucket(this.resumeBucketName);
  }

  async uploadResume(
    applicationId: number,
    email: string,
    file: Express.Multer.File,
  ): Promise<string> {
    const extension = file.originalname.split(".").pop() || "pdf";
    const resumeId = `${applicationId}_${email}_${uuidv4()}`;
    const filename = `resumes/${resumeId}.${extension}`;
    const blob = this.resumeBucket.file(filename);

    await blob.save(file.buffer, {
      metadata: {
        contentType: file.mimetype,
        metadata: {
          applicationId: applicationId.toString(),
          email: email,
          uploadedAt: new Date().toISOString(),
        },
      },
    });

    // Return the public URL
    return `https://storage.googleapis.com/${this.resumeBucketName}/${filename}`;
  }

  async getResumeUrl(resumePath: string): Promise<string> {
    return resumePath;
  }

  /**
   * Accept an application for a specific team.
   * Logic:
   * - If the team is firstChoiceTeam and firstChoiceStatus is pending, accept it
   * - If the team is secondChoiceTeam, secondChoiceStatus is pending, and firstChoiceStatus is rejected, accept it
   * - Otherwise, throw an error
   */
  async acceptApplication(
    applicationId: number,
    team: OrganizerTeam,
  ): Promise<OrganizerApplication> {
    const application = await this.applicationRepo
      .findOne(applicationId)
      .exec();

    if (!application) {
      throw new BadRequestException("Application not found");
    }

    // Case 1: Accepting for first choice team
    if (application.firstChoiceTeam === team) {
      const status = application.firstChoiceStatus || ApplicationStatus.PENDING;
      if (status !== ApplicationStatus.PENDING) {
        throw new BadRequestException(
          `Cannot accept application ${applicationId} for first choice team ${team}. ` +
            `Current status: ${status}`,
        );
      }

      return this.applicationRepo
        .patchOne(applicationId, {
          firstChoiceStatus: ApplicationStatus.ACCEPTED,
          assignedTeam: team,
        })
        .exec();
    }

    // Case 2: Accepting for second choice team
    if (application.secondChoiceTeam === team) {
      const firstStatus =
        application.firstChoiceStatus || ApplicationStatus.PENDING;
      const secondStatus =
        application.secondChoiceStatus || ApplicationStatus.PENDING;

      // Can only accept for second choice if first choice rejected
      if (firstStatus !== ApplicationStatus.REJECTED) {
        throw new BadRequestException(
          `Cannot accept application ${applicationId} for second choice team ${team}. ` +
            `First choice status must be rejected. Current: ${firstStatus}`,
        );
      }

      if (secondStatus !== ApplicationStatus.PENDING) {
        throw new BadRequestException(
          `Cannot accept application ${applicationId} for second choice team ${team}. ` +
            `Current status: ${secondStatus}`,
        );
      }

      return this.applicationRepo
        .patchOne(applicationId, {
          secondChoiceStatus: ApplicationStatus.ACCEPTED,
          assignedTeam: team,
        })
        .exec();
    }

    // Team doesn't match either first or second choice
    throw new BadRequestException(
      `Team ${team} is not a choice for application ${applicationId}. ` +
        `First choice: ${application.firstChoiceTeam}, second choice: ${application.secondChoiceTeam}`,
    );
  }

  /**
   * Reject an application from a specific team.
   * Logic:
   * - If the team is firstChoiceTeam and firstChoiceStatus is pending, reject it (opens second choice)
   * - If the team is secondChoiceTeam and secondChoiceStatus is pending, reject it (final rejection)
   * - Otherwise, throw an error
   */
  async rejectApplication(
    applicationId: number,
    team: OrganizerTeam,
  ): Promise<OrganizerApplication> {
    const application = await this.applicationRepo
      .findOne(applicationId)
      .exec();

    if (!application) {
      throw new BadRequestException("Application not found");
    }

    // Case 1: Rejecting from first choice team
    if (application.firstChoiceTeam === team) {
      const status = application.firstChoiceStatus || ApplicationStatus.PENDING;
      if (status !== ApplicationStatus.PENDING) {
        throw new BadRequestException(
          `Cannot reject application ${applicationId} from first choice team ${team}. ` +
            `Current status: ${status}`,
        );
      }

      return this.applicationRepo
        .patchOne(applicationId, {
          firstChoiceStatus: ApplicationStatus.REJECTED,
        })
        .exec();
    }

    // Case 2: Rejecting from second choice team
    if (application.secondChoiceTeam === team) {
      const status =
        application.secondChoiceStatus || ApplicationStatus.PENDING;
      if (status !== ApplicationStatus.PENDING) {
        throw new BadRequestException(
          `Cannot reject application ${applicationId} from second choice team ${team}. ` +
            `Current status: ${status}`,
        );
      }

      return this.applicationRepo
        .patchOne(applicationId, {
          secondChoiceStatus: ApplicationStatus.REJECTED,
        })
        .exec();
    }

    // Team doesn't match either first or second choice
    throw new BadRequestException(
      `Team ${team} is not a choice for application ${applicationId}. ` +
        `First choice: ${application.firstChoiceTeam}, second choice: ${application.secondChoiceTeam}`,
    );
  }

  /**
   * Get all applications for a specific team, filtering by what stage they're in:
   * - For first choice: show applications where firstChoiceStatus is pending
   * - For second choice: show applications where firstChoiceStatus is rejected and secondChoiceStatus is pending
   */
  async getApplicationsForTeam(team: OrganizerTeam): Promise<{
    firstChoiceApplications: OrganizerApplication[];
    secondChoiceApplications: OrganizerApplication[];
  }> {
    // Get applications where this team is the first choice and firstChoiceStatus is pending
    const firstChoiceApplications = await OrganizerApplication.query()
      .where("firstChoiceTeam", team)
      .where("firstChoiceStatus", ApplicationStatus.PENDING);

    // Get applications where this team is the second choice, firstChoiceStatus is rejected,
    // and secondChoiceStatus is pending
    const secondChoiceApplications = await OrganizerApplication.query()
      .where("secondChoiceTeam", team)
      .where("firstChoiceStatus", ApplicationStatus.REJECTED)
      .where("secondChoiceStatus", ApplicationStatus.PENDING);

    return {
      firstChoiceApplications,
      secondChoiceApplications,
    };
  }
}
