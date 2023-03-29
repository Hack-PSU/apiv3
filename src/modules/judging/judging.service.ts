import { Injectable } from "@nestjs/common";
import { InjectRepository, Repository } from "common/objection";
import { Score } from "entities/score.entity";
import { User } from "entities/user.entity";
import { Organizer } from "entities/organizer.entity";

@Injectable()
export class JudgingService {
  constructor(
    @InjectRepository(Score)
    private readonly scoreRepo: Repository<Score>,
    @InjectRepository(Organizer)
    private readonly userRepo: Repository<Organizer>,
  ) {}

  async createAssignments(
    users: string[],
    projects: number[],
    projectsPerUser: number,
  ) {}
}
