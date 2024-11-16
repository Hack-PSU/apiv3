import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  ValidationPipe,
} from "@nestjs/common";
import { ApiTags, OmitType } from "@nestjs/swagger";
import { ApiDoc } from "common/docs";
import { RestrictedRoles, Role, Roles } from "common/gcp";
import { InjectRepository, Repository } from "common/objection";
import {
  Finance,
  FinanceEntity,
  Status,
  SubmitterType,
} from "entities/finance.entity";
import { Hackathon } from "entities/hackathon.entity";
import { Organizer } from "entities/organizer.entity";
import { User } from "entities/user.entity";
import { update } from "lodash";
import { nanoid } from "nanoid";

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
    @InjectRepository(Hackathon)
    private readonly hackathonRepo: Repository<Hackathon>,
  ) {}

  @Get("/")
  @Roles(Role.EXEC)
  async getFinance(): Promise<Finance[]> {
    return this.financeRepo.findAll().exec();
  }

  @Post("/")
  @RestrictedRoles({
    predicate: (request) =>
      request.user && request.body.submitterId === request.user?.sub,
    roles: [Role.NONE],
  })
  @Roles(Role.TEAM)
  async createFinance(
    @Body(
      new ValidationPipe({
        transform: true,
        forbidNonWhitelisted: true,
        whitelist: true,
      }),
    )
    finance: FinanceCreateEntity,
  ): Promise<Finance> {
    // An Upload decorator still has to be implemented to handle file uploads

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

    // Create new finance entity
    const newFinance: Partial<Finance> = {
      id: nanoid(32),
      status: Status.PENDING,
      createdAt: Date.now(),
      hackathonId: hackathon.id,
      updatedBy: finance.submitterId,
      receiptUrl: "",
      ...finance,
    };

    return this.financeRepo.createOne(newFinance).exec();
  }
}
