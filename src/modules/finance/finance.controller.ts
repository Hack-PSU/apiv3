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

class BaseFinanceCreateEntity extends OmitType(FinanceEntity, [
  "id",
  "createdAt",
  "hackathonId",
  "updatedBy",
  "receiptUrl",
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
      receiptUrl = await this.financeService.uploadReceipt(
        finance.submitterId,
        receipt,
      );
    }

    // Create new finance entity
    const newFinance: Partial<Finance> = {
      id: nanoid(32),
      status: finance.status || Status.PENDING,
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
  @Roles(Role.TECH)
  @ApiDoc({
    summary: "Returns a cheque request form as a PDF",
    params: [
      {
        name: "id",
        description: "ID must be set to an reimbursement ID",
      },
    ],
    response: {
      ok: { type: StreamableFile },
    },
    auth: Role.TECH,
  })
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
      Group1: "Choice1",
    };

    const pdfBytes = await this.financeService.populateReimbursementForm(
      ReimbursementFormName,
      formData,
      finance.id,
    );

    const pdfBuffer = Buffer.from(pdfBytes);
    return new StreamableFile(pdfBuffer);
  }
}
