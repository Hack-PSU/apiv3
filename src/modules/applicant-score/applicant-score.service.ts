import { Injectable } from "@nestjs/common";
import { InjectRepository, Repository } from "common/objection";
import { ApplicantScore } from "entities/applicant-score.entity";
import { ApplicantScoreDto } from "./dto/applicant-score.dto";

@Injectable()
export class ApplicantScoreService {
  constructor(
    @InjectRepository(ApplicantScore)
    private readonly applicantScoreRepo: Repository<ApplicantScore>,
  ) {}

  async overwriteAll(scores: ApplicantScoreDto[]): Promise<ApplicantScore[]> {
    const knex = ApplicantScore.knex();

    return knex.transaction(async (trx) => {
      // 1. Delete all existing records
      await ApplicantScore.query(trx).delete();

      // 2. Insert new records
      if (scores.length > 0) {
        return ApplicantScore.query(trx).insert(scores).returning("*");
      }

      return [];
    });
  }
}