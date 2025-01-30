import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Post,
  UseInterceptors,
  ValidationPipe,
  Param,
  Patch,
} from "@nestjs/common";
import {
  ApiTags,
  IntersectionType,
  OmitType,
  PartialType,
  PickType,
} from "@nestjs/swagger";
import { ApiDoc } from "common/docs";
import { RestrictedRoles, Role, Roles } from "common/gcp";
import { InjectRepository, Repository } from "common/objection";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  Finance,
  FinanceEntity,
  Status,
  SubmitterType,
} from "entities/finance.entity";
import { Hackathon } from "entities/hackathon.entity";
import { Organizer } from "entities/organizer.entity";
import { User } from "entities/user.entity";
import { nanoid } from "nanoid";
import { FinanceService } from "./finance.service";
import { UploadedReceipt } from "./uploaded-receipt.decorator";
import { ReimbursementForm, ReimbursementFormName } from "./reimbursement-form";
import { DefaultTemplate, SendGridService } from "common/sendgrid";

class BaseFinanceCreateEntity extends OmitType(FinanceEntity, [
  "id",
  "createdAt",
  "hackathonId",
  "updatedBy",
  "receiptUrl",
  "status",
]) {}

class OptionalStatus extends PartialType(
  PickType(FinanceEntity, ["status"] as const),
) {}

export class FinanceCreateEntity extends IntersectionType(
  BaseFinanceCreateEntity,
  OptionalStatus,
) {}

@ApiTags("Finance")
@Controller("finances")
export class FinanceController {
  constructor(
    @InjectRepository(Finance)
    private readonly financeRepo: Repository<Finance>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Organizer)
    private readonly organizerRepo: Repository<Organizer>,
    private readonly financeService: FinanceService,
    private readonly sendGridService: SendGridService,
  ) {}

  @Get("/")
  @Roles(Role.EXEC)
  @ApiDoc({
    summary: "Get all Reimbursements",
    response: {
      ok: { type: FinanceEntity, isArray: true },
    },
    auth: Role.EXEC,
  })
  async getFinance(): Promise<Finance[]> {
    return this.financeRepo.findAll().exec();
  }

  @Get(":id")
  @Roles(Role.EXEC)
  @ApiDoc({
    summary: "Get a Reimbursement",
    params: [
      {
        name: "id",
        description: "ID must be set to an reimbursement ID",
      },
    ],
    response: {
      ok: { type: FinanceEntity },
    },
    auth: Role.NONE,
  })
  async getOne(@Param("id") id: string) {
    return this.financeRepo.findOne(id).exec();
  }

  @Post("/")
  @RestrictedRoles({
    predicate: (request) =>
      request.user && request.body.submitterId === request.user?.sub,
    roles: [Role.NONE, Role.TEAM, Role.EXEC],
  })
  @UseInterceptors(FileInterceptor("receipt"))
  @ApiDoc({
    summary: "Create a Finance Entry",
    request: {
      mimeTypes: ["multipart/form-data"],
      body: { type: FinanceCreateEntity },
      validate: true,
    },
    response: {
      created: { type: FinanceEntity },
    },
  })
  async createFinance(
    @Body(
      new ValidationPipe({
        transform: true,
        forbidNonWhitelisted: true,
        whitelist: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    )
    finance: FinanceCreateEntity,
    @UploadedReceipt() receipt?: Express.Multer.File,
  ): Promise<Finance> {
    // Validate submitter
    if (finance.submitterType === SubmitterType.USER) {
      const user = await this.userRepo.findOne(finance.submitterId).exec();
      if (!user) {
        throw new NotFoundException("User not found");
      }
    } else if (finance.submitterType === SubmitterType.ORGANIZER) {
      const organizer = await this.organizerRepo
        .findOne(finance.submitterId)
        .exec();
      if (!organizer) {
        throw new NotFoundException("Organizer not found");
      }
    } else {
      throw new BadRequestException("Invalid submitter type");
    }

    // Get Active Hackathon
    const hackathon = await Hackathon.query().findOne({ active: true });
    if (!hackathon) {
      throw new NotFoundException("No active hackathon found");
    }

    const financeId = nanoid(32);

    // Upload receipt file if provided
    let receiptUrl = "";
    if (receipt) {
      receiptUrl = await this.financeService.uploadReceipt(financeId, receipt);
    }

    // Create new finance entity
    const newFinance: Partial<Finance> = {
      id: financeId,
      status: Status.PENDING,
      createdAt: Date.now(),
      hackathonId: hackathon.id,
      updatedBy: finance.submitterId,
      receiptUrl,
      ...finance,
    };

    return this.financeRepo.createOne(newFinance).exec();
  }

  @Patch(":id/status")
  @ApiDoc({
    summary: "Update a Reimbursement's status",
    params: [
      {
        name: "id",
        description: "ID must be set to an reimbursement ID",
      },
    ],
    request: {
      body: { type: OptionalStatus },
      validate: true,
    },
    response: {
      ok: { type: FinanceEntity },
    },
    auth: Role.FINANCE,
  })
  async updateStatus(
    @Param("id") id: string,
    @Body(
      new ValidationPipe({
        transform: true,
        forbidNonWhitelisted: true,
        whitelist: true,
      }),
    )
    status: OptionalStatus,
  ) {
    const finance = await this.financeRepo.findOne(id).exec();
    if (!finance) {
      throw new NotFoundException("Financial record not found");
    }

    /* if (finance.status !== Status.PENDING) {
      throw new BadRequestException(
        "Cannot update status of non-pending record",
      );
    } */

    if (status.status) {
      finance.status = status.status;
    }

    try {
      const _newFinance = await this.financeRepo.patchOne(id, finance).exec();
    } catch (err) {
      console.error("PatchOne threw an error:", err);
    }

    let payee: string;
    let email: string;
    if (finance.submitterType === SubmitterType.USER) {
      const user = await this.userRepo.findOne(finance.submitterId).exec();
      if (!user) {
        throw new NotFoundException("User not found");
      }
      payee = user.firstName + " " + user.lastName;
      email = user.email;
    } else if (finance.submitterType === SubmitterType.ORGANIZER) {
      const organizer = await this.organizerRepo
        .findOne(finance.submitterId)
        .exec();
      if (!organizer) {
        throw new NotFoundException("Organizer not found");
      }
      payee = organizer.firstName + " " + organizer.lastName;
      email = organizer.email;
    }

    if (finance.status === Status.APPROVED) {
      const formData: ReimbursementForm = {
        unrestricted30: true,
        orgAcct: 1657,
        fs1: 30,
        amount1: finance.amount,
        total: finance.amount,
        organization: "HackPSU",
        payeeName: payee,
        mailingAddress1: finance.street,
        mailingAddress2:
          finance.city + ", " + finance.state + " " + finance.postalCode,
        email: "finance@hackpsu.org",
        description1: finance.description,
        objectCode1: finance.category,
        Date: new Date().toLocaleDateString(),
        Group1: "Choice2",
      };

      const pdfBytes = await this.financeService.populateReimbursementForm(
        ReimbursementFormName,
        formData,
        finance.id,
      );

      const pdfBuffer = Buffer.from(pdfBytes);
      const reimbursementFormUrl =
        await this.financeService.uploadReimbursementForm(
          finance.id,
          pdfBuffer,
        );
      // email a link of the pdf to the finance team

      const reimbursementFormMessage =
        await this.sendGridService.populateTemplate(
          DefaultTemplate.reimbursementFormCompleted,
          {
            name: payee,
            amount: finance.amount,
            description: finance.description,
            formLink: reimbursementFormUrl,
          },
        );

      const receipt = await this.financeService
        .getInvoiceFile(finance.id)
        .download();

      await this.sendGridService
        .send({
          from: "team@hackpsu.org",
          to: "technology@hackpsu.org",
          subject: "Reimbursement Form Completed",
          message: reimbursementFormMessage,
          attachments: [
            {
              content: pdfBuffer.toString("base64"),
              filename: finance.id + "_reimbursementForm.pdf",
              type: "application/pdf",
              disposition: "attachment",
            },
            {
              // convert the receipt to base64
              content: receipt[0].toString("base64"),
              filename: finance.id + "_receipt.pdf",
              type: "application/pdf",
              disposition: "attachment",
            },
          ],
        })
        .catch((err) => {
          console.error("Error sending email", err);
          console.error("error body", err.response.body);
        });

      // Let the user know that their reimbursement was approved
      const reimbursementApprovedMessage =
        await this.sendGridService.populateTemplate(
          DefaultTemplate.reimbursementApproved,
          {
            firstName: payee,
            amount: finance.amount,
          },
        );

      await this.sendGridService.send({
        from: "finance@hackpsu.org",
        to: email,
        subject: "HackPSU Reimbursement Approved",
        message: reimbursementApprovedMessage,
      });
    } else if (finance.status === Status.REJECTED) {
      // Email user that their reimbursement was rejected
      const reimbursementRejectedMessage =
        await this.sendGridService.populateTemplate(
          DefaultTemplate.reimbursementRejected,
          {
            firstName: payee,
          },
        );
      await this.sendGridService.send({
        from: "finance@hackpsu.org",
        to: email,
        subject: "HackPSU Reimbursement Rejected",
        message: reimbursementRejectedMessage,
      });
    }
  }
}
