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
      // Insert or update records based on composite primary key (hackathonId, userId)
      if (scores.length > 0) {
        const rows = scores.map((score) =>
          ApplicantScore.fromJson(score).$toDatabaseJson(),
        );

        // Use onConflict to handle upsert on composite primary key
        await knex("applicant_scores")
          .transacting(trx)
          .insert(rows)
          .onConflict(["hackathon_id", "user_id"])
          .merge();
      }

      return scores as unknown as ApplicantScore[];
    });
  }
  async updatePrioritized(
    userId: string,
    hackathonId: string,
    prioritized: boolean,
    ): Promise<ApplicantScore> {
      const updated = await ApplicantScore.query()
        .patch({ prioritized })
        .where({ userId, hackathonId })
        .returning("*")
        .first();

      if (!updated) {
        throw new Error(
          `Applicant score not found for userId: ${userId}, hackathonId: ${hackathonId}`,
        );
      }

      return updated;
    }
}