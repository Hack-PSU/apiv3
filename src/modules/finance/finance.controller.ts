import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  NotFoundException,
  Post,
  UseInterceptors,
  ValidationPipe,
  StreamableFile,
  Param,
  Req,
} from "@nestjs/common";
import { ApiTags, OmitType } from "@nestjs/swagger";
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
import { Request } from "express";
import { UploadedReceipt } from "./uploaded-receipt.decorator";

class FinanceCreateEntity extends OmitType(FinanceEntity, [
  "id",
  "status",
  "createdAt",
  "hackathonId",
  "updatedBy",
  "receiptUrl",
]) {}

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
  ) {}

  @Get("/")
  @Roles(Role.EXEC)
  @ApiDoc({
    summary: "Get Finance",
    response: {
      ok: { type: FinanceEntity},
    },
    auth: Role.NONE,
  })
  async getFinance(): Promise<Finance[]> {
    return this.financeRepo.findAll().exec();
  }

  @Get(":id")
  @Roles(Role.EXEC)
  @ApiDoc({
    summary: "Get an Reimbursement",
    params: [
      {
        name: "id",
        description: "ID must be set to an reimbursement ID",
      },
    ],
    response: {
      ok: { type: FinanceEntity},
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
  @Roles(Role.TECH)
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

    // Upload receipt file if provided
    let receiptUrl = "";
    if (receipt) {
      receiptUrl = await this.financeService.uploadReceipt(finance.submitterId, receipt);
    }

    // Create new finance entity
    const newFinance: Partial<Finance> = {
      id: nanoid(32),
      status: Status.PENDING,
      createdAt: Date.now(),
      hackathonId: hackathon.id,
      updatedBy: finance.submitterId,
      receiptUrl,
      ...finance,
    };

    return this.financeRepo.createOne(newFinance).exec();
  }

  @Get("/:id/cheque")
  @Header("Content-Type", "application/pdf")
  async getCheque(@Param("id") id: string): Promise<StreamableFile> {
    const finance = await this.financeRepo.findOne(id).exec();

    if (!finance) {
      throw new NotFoundException("Financial record not found");
    }

    if (finance.status !== Status.APPROVED) {
      throw new BadRequestException("Financial record not approved");
    }

    let payee: string;

    if (finance.submitterType === SubmitterType.USER) {
      const user = await this.userRepo.findOne(finance.submitterId).exec();
      if (!user) {
        throw new NotFoundException("User not found");
      }

      payee = user.firstName + " " + user.lastName;
    } else if (finance.submitterType === SubmitterType.ORGANIZER) {
      const organizer = await this.organizerRepo
        .findOne(finance.submitterId)
        .exec();

      if (!organizer) {
        throw new NotFoundException("Organizer not found");
      }
      payee = organizer.firstName + " " + organizer.lastName;
    }

    // Call the service method to generate the PDF bytes
    const pdfBytes = await this.financeService.populateTemplate(
      "cheque-request-form",
      {
        "UNRESTRICTED  30": true,
        ORGACCT: 1657,
        FS1: 30,
        "Amount 1": finance.amount,
        TOTAL: finance.amount,
        ORGANIZATION: "HackPSU",
        "PAYEE please print clearly": payee,
        "MAILING ADDRESS If applicable 1": finance.street,
        "MAILING ADDRESS If applicable 2":
          finance.city + ", " + finance.state + " " + finance.postalCode,
        EMAIL: "finance@hackpsu.org",
        "Description 1": finance.description,
        "Object Code 1": finance.category,
        "Today's Date 1_af_date": new Date().toLocaleDateString(),
        Group1: "Choice2",
      },
      finance.id,
    );

    const pdfBuffer = Buffer.from(pdfBytes);

    return new StreamableFile(pdfBuffer);
  }
}
