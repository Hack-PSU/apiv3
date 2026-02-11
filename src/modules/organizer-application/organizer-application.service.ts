import { Injectable, BadRequestException } from "@nestjs/common";
import * as admin from "firebase-admin";
import { v4 as uuidv4 } from "uuid";
import {
  OrganizerApplication,
  ApplicationStatus,
  OrganizerTeam,
} from "entities/organizer-application.entity";
import { InjectRepository, Repository } from "common/objection";
import { Organizer } from "entities/organizer.entity";
import { Role, FirebaseAuthService } from "common/gcp";
import { nanoid } from "nanoid";
import {
  DefaultFromEmail,
  DefaultTemplate,
  SendGridService,
} from "common/sendgrid";

@Injectable()
export class OrganizerApplicationService {
  private resumeBucketName = "hackpsu-organizer-applications";

  constructor(
    @InjectRepository(OrganizerApplication)
    private readonly applicationRepo: Repository<OrganizerApplication>,
    @InjectRepository(Organizer)
    private readonly organizerRepo: Repository<Organizer>,
    private readonly sendGridService: SendGridService,
    private readonly firebaseAuth: FirebaseAuthService,
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
   * - When accepted, automatically create an organizer account
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

    let updatedApplication: OrganizerApplication;

    // Case 1: Accepting for first choice team
    if (application.firstChoiceTeam === team) {
      const status = application.firstChoiceStatus || ApplicationStatus.PENDING;
      if (status !== ApplicationStatus.PENDING) {
        throw new BadRequestException(
          `Cannot accept application ${applicationId} for first choice team ${team}. ` +
            `Current status: ${status}`,
        );
      }

      updatedApplication = await this.applicationRepo
        .patchOne(applicationId, {
          firstChoiceStatus: ApplicationStatus.ACCEPTED,
          assignedTeam: team,
        })
        .exec();

      await this.createOrganizerFromApplication(application, team);
      return updatedApplication;
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

      updatedApplication = await this.applicationRepo
        .patchOne(applicationId, {
          secondChoiceStatus: ApplicationStatus.ACCEPTED,
          assignedTeam: team,
        })
        .exec();

      await this.createOrganizerFromApplication(application, team);
      return updatedApplication;
    }

    // Team doesn't match either first or second choice
    throw new BadRequestException(
      `Team ${team} is not a choice for application ${applicationId}. ` +
        `First choice: ${application.firstChoiceTeam}, second choice: ${application.secondChoiceTeam}`,
    );
  }

  /**
   * Create an organizer account from an accepted application
   */
  private async createOrganizerFromApplication(
    application: OrganizerApplication,
    team: OrganizerTeam,
  ): Promise<void> {
    // Parse name into first and last name
    const nameParts = application.name.trim().split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(" ") || "";

    let uid: string;

    try {
      // Check if user already exists with this email
      const existingUser = await this.firebaseAuth.getUserByEmail(
        application.email,
      );
      uid = existingUser.uid;

      // Update user's privilege to TEAM role
      await this.firebaseAuth.updateUserPrivilege(uid, Role.TEAM);
    } catch (error) {
      // If user doesn't exist, create a new one
      const tempPassword = nanoid(16);
      uid = await this.firebaseAuth.createUserWithPrivilege(
        application.email,
        tempPassword,
        Role.TEAM,
      );
    }

    // Check if organizer already exists
    const existingOrganizer = await this.organizerRepo.findOne(uid).exec();

    if (!existingOrganizer) {
      // Create organizer in database
      await this.organizerRepo
        .createOne({
          id: uid,
          firstName,
          lastName,
          email: application.email,
          privilege: Role.TEAM,
          team,
          isActive: true,
        })
        .exec();
    } else {
      // Update existing organizer
      await this.organizerRepo
        .patchOne(uid, {
          privilege: Role.TEAM,
          team,
          isActive: true,
        })
        .exec();
    }

    // Send welcome email with password reset link
    const passwordResetLink = await this.firebaseAuth.generatePasswordResetLink(
      application.email,
    );

    const message = await this.sendGridService.populateTemplate(
      DefaultTemplate.organizerFirstLogin,
      {
        previewText: "HackPSU Organizer Account",
        passwordResetLink,
        firstName,
      },
    );

    await this.sendGridService.send({
      to: application.email,
      from: DefaultFromEmail,
      subject: "HackPSU Organizer Account",
      message,
    });
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
