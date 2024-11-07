import { Body, Controller, Get, Post } from "@nestjs/common";
import { ApiTags, OmitType } from "@nestjs/swagger";
import { InjectRepository, Repository } from "common/objection";
import { Finance, FinanceEntity } from "entities/finance.entity";

class FinanceCreateEntiy extends OmitType(FinanceEntity, ["id"] as const) {}

@ApiTags("Finance")
@Controller("finances")
export class FinanceController {
  constructor(
    @InjectRepository(Finance)
    private readonly financeRepo: Repository<Finance>,
  ) {}

  @Get("/")
  async getFinance(): Promise<Finance[]> {
    return this.financeRepo.findAll().exec();
  }

  @Post("/")
  async createFinance(@Body() finance: FinanceCreateEntiy): Promise<Finance> {
    // remeber to create id, dont get the link of invoice, instead upload it to the bucket
    return this.financeRepo.createOne(finance).exec();
  }
}
