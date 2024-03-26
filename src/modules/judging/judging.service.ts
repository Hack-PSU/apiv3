import { Injectable } from "@nestjs/common";
import { InjectRepository, Repository } from "common/objection";
import { Organizer } from "entities/organizer.entity";
import { Project } from "entities/project.entity";
import { Score } from "entities/score.entity";
import * as jStat from "jstat";
import * as _ from "lodash";

interface JudgeAssignment {
  judgeId: string;
  projectId: number;
  hackathonId: string;
}

const GAMMA = 0.1;
const KAPPA = 0.0001;
const E: number = Math.E;
const MU_PRIOR = 0.0;
const SIGMA_SQ_PRIOR = 1.0;
const ALPHA_PRIOR = 10.0;
const BETA_PRIOR = 1.0;
const EPSILON = 0.25;

@Injectable()
export class JudgingService {
  constructor(
    @InjectRepository(Score)
    private readonly scoreRepo: Repository<Score>,
    @InjectRepository(Organizer)
    private readonly userRepo: Repository<Organizer>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
  ) {}

  private min_array<T>(...arrays: T[][]) {
    return arrays.reduce((min, arr) => (arr.length < min.length ? arr : min));
  }

  async getUnassignedProjects() {
    return this.projectRepo
      .findAll()
      .byHackathon()
      .leftJoinRelated("scores")
      .where("scores.projectId", null);
  }

  async getMinCountProjects(judgeId: string, excludeProjects: number[]) {
    const minCountQuery = this.scoreRepo
      .findAll()
      .byHackathon()
      .count("projectId", { as: "count" })
      .groupBy("projectId")
      .orderBy("count")
      .limit(1);

    const minCountProjects = await this.projectRepo
      .findAll()
      .byHackathon()
      .whereNotIn("projects.id", excludeProjects)
      .joinRelated("scores")
      .whereNot("scores.judgeId", judgeId)
      .count("scores.projectId", { as: "count" })
      .groupBy("projects.id")
      .having("count", "=", minCountQuery)
      .select("projects.id");

    return minCountProjects.map((c) => c.id);
  }

  async createAssignments(users: string[], projectsPerUser: number) {
    const organizers = (await this.userRepo.findAll().exec()).filter((user) =>
      users.includes(user.id),
    );
    // assign organizer to awards
    const awards = [
      {
        name: "Sustainability",
        judgingLocation: "Room 126 (War Room)",
      },
      {
        name: "Generative AI",
        judgingLocation: "Auditorium",
      },
    ];

    // Asigns organizers/etc to an award
    let awardNum = 0;
    const techMembers = organizers.filter((user) => user.team === "tech");
    const execMembers = organizers.filter((user) => user.team === "exec");
    const otherMembers = organizers.filter(
      (user) => user.team !== "tech" && user.team !== "exec",
    );
    for (const judge of techMembers) {
      judge.award = awards[awardNum % awards.length].name;
      judge.judgingLocation = awards[awardNum % awards.length].judgingLocation;
      awardNum += 1;
    }
    for (const judge of execMembers) {
      judge.award = awards[awardNum % awards.length].name;
      judge.judgingLocation = awards[awardNum % awards.length].judgingLocation;
      awardNum += 1;
    }
    for (const judge of otherMembers) {
      judge.award = awards[awardNum % awards.length].name;
      judge.judgingLocation = awards[awardNum % awards.length].judgingLocation;
      awardNum += 1;
    }
    organizers.forEach((organizer) => {
      this.userRepo.patchOne(organizer.id, organizer).exec();
    });

    // assign organizers to projects
    const projects = await this.projectRepo.findAll().byHackathon().execute();

    // list containing projects for each challenge
    const challenge1 = [];
    const challenge2 = [];
    const _challenge = [];

    // divides projects into challenges
    for (const project of projects) {
      let temp = project.categories;
      if (!temp) {
        _challenge.push({
          projectId: project.id,
          hackathonId: project.hackathonId,
        });
        continue;
      }
      temp = temp.split(",");
      for (const element of temp) {
        if (element == "challenge1") {
          challenge1.push({
            projectId: project.id,
            hackathonId: project.hackathonId,
          });
        } else if (element == "challenge2") {
          challenge2.push({
            projectId: project.id,
            hackathonId: project.hackathonId,
          });
        } else {
          _challenge.push({
            projectId: project.id,
            hackathonId: project.hackathonId,
          });
        }
      }
    }
    for (const element of _challenge) {
      const min = this.min_array(challenge1, challenge2);
      min.push(element);
    }

    // assigns projects to organizers/etc
    const assignments: JudgeAssignment[] = [];
    let projectIdx = 0;
    for (const organizer of organizers.filter(
      (judge) => judge.award === "Sustainability",
    )) {
      for (let i = 0; i < projectsPerUser; i++, projectIdx++) {
        assignments.push({
          judgeId: organizer.id,
          projectId: challenge1[projectIdx % challenge1.length].projectId,
          hackathonId: challenge1[projectIdx % challenge1.length].hackathonId,
        });
      }
    }
    projectIdx = 0;
    for (const organizer of organizers.filter(
      (judge) => judge.award === "Generative AI",
    )) {
      for (let i = 0; i < projectsPerUser; i++, projectIdx++) {
        assignments.push({
          judgeId: organizer.id,
          projectId: challenge2[projectIdx % challenge2.length].projectId,
          hackathonId: challenge2[projectIdx % challenge2.length].hackathonId,
        });
      }
    }
    return assignments;
  }

  async reassignJudge(judgeId: string, excludeProjects: number[]) {
    const unassignedProjects = await this.getUnassignedProjects();
    const validUnassignedProjects = unassignedProjects.filter(
      (p) => !excludeProjects.includes(p.id),
    );

    if (validUnassignedProjects.length > 0) {
      const projectIdx = _.random(validUnassignedProjects.length - 1);
      return { judgeId, projectId: validUnassignedProjects[projectIdx].id };
    } else {
      const minCountProjects = await this.getMinCountProjects(
        judgeId,
        excludeProjects,
      );

      if (minCountProjects.length > 0) {
        const projectIdx = _.random(minCountProjects.length - 1);
        return { judgeId, projectId: minCountProjects[projectIdx] };
      } else {
        return null;
      }
    }
  }

  update(
    alpha: number,
    beta: number,
    muWinner: number,
    sigmaSqWinner: number,
    muLoser: number,
    sigmaSqLoser: number,
  ): [number, number, number, number, number, number] {
    const [updatedAlpha, updatedBeta, _] = this.updateAnnotator(
      alpha,
      beta,
      muWinner,
      sigmaSqWinner,
      muLoser,
      sigmaSqLoser,
    );
    const [updatedMuWinner, updatedMuLoser] = this.updateMus(
      alpha,
      beta,
      muWinner,
      sigmaSqWinner,
      muLoser,
      sigmaSqLoser,
    );
    const [updatedSigmaSqWinner, updatedSigmaSqLoser] = this.updateSigmaSqs(
      alpha,
      beta,
      muWinner,
      sigmaSqWinner,
      muLoser,
      sigmaSqLoser,
    );

    return [
      updatedAlpha,
      updatedBeta,
      updatedMuWinner,
      updatedSigmaSqWinner,
      updatedMuLoser,
      updatedSigmaSqLoser,
    ];
  }

  updateAnnotator(
    alpha: number,
    beta: number,
    muWinner: number,
    sigmaSqWinner: number,
    muLoser: number,
    sigmaSqLoser: number,
  ): [number, number, number] {
    const eMuWinner = E ** muWinner;
    const eMuLoser = E ** muLoser;
    const c1 =
      eMuWinner / (eMuWinner + eMuLoser) +
      (0.5 *
        (sigmaSqWinner + sigmaSqLoser) *
        (eMuWinner * eMuLoser * (eMuLoser - eMuWinner))) /
        (eMuWinner + eMuLoser) ** 3;
    const c2 = 1.0 - c1;
    const c = (c1 * alpha + c2 * beta) / (alpha + beta);

    const expected =
      (c1 * (alpha + 1.0) * alpha + c2 * alpha * beta) /
      (c * (alpha + beta + 1.0) * (alpha + beta));
    const expectedSq =
      (c1 * (alpha + 2.0) * (alpha + 1.0) * alpha +
        c2 * (alpha + 1.0) * alpha * beta) /
      (c * (alpha + beta + 2.0) * (alpha + beta + 1.0) * (alpha + beta));
    const variance = expectedSq - expected ** 2;

    const updatedAlpha = ((expected - expectedSq) * expected) / variance;
    const updatedBeta = ((expected - expectedSq) * (1.0 - expected)) / variance;

    return [updatedAlpha, updatedBeta, c];
  }

  updateMus(
    alpha: number,
    beta: number,
    muWinner: number,
    sigmaSqWinner: number,
    muLoser: number,
    sigmaSqLoser: number,
  ): [number, number] {
    const eMuWinner = E ** muWinner;
    const eMuLoser = E ** muLoser;
    const mult =
      (alpha * eMuWinner) / (alpha * eMuWinner + beta * eMuLoser) -
      eMuWinner / (eMuWinner + eMuLoser);

    const updatedMuWinner = muWinner + mult * sigmaSqWinner;
    const updatedMuLoser = muLoser - mult * sigmaSqLoser;

    return [updatedMuWinner, updatedMuLoser];
  }

  updateSigmaSqs(
    alpha: number,
    beta: number,
    muWinner: number,
    sigmaSqWinner: number,
    muLoser: number,
    sigmaSqLoser: number,
  ): [number, number] {
    const eMuWinner = Math.exp(muWinner);
    const eMuLoser = Math.exp(muLoser);
    const mult =
      (alpha * eMuWinner * beta * eMuLoser) /
        Math.pow(alpha * eMuWinner + beta * eMuLoser, 2) -
      (eMuWinner * eMuLoser) / Math.pow(eMuWinner + eMuLoser, 2);

    const updatedSigmaSqWinner =
      sigmaSqWinner * Math.max(1.0 + mult * sigmaSqWinner, KAPPA);
    const updatedSigmaSqLoser =
      sigmaSqLoser * Math.max(1.0 + mult * sigmaSqLoser, KAPPA);

    return [updatedSigmaSqWinner, updatedSigmaSqLoser];
  }

  divergenceGaussian(
    mu1: number,
    sigmaSq1: number,
    mu2: number,
    sigmaSq2: number,
  ): number {
    const sigmaRatio = sigmaSq1 / sigmaSq2;
    const leftTerm = Math.pow(mu1 - mu2, 2) / (2.0 * sigmaSq2);
    const rightTerm = (sigmaRatio - 1.0 - Math.log(sigmaRatio)) / 2.0;
    return leftTerm + rightTerm;
  }

  divergenceBeta(
    alpha1: number,
    beta1: number,
    alpha2: number,
    beta2: number,
  ): number {
    const lnTerm = jStat.betafn(alpha2, beta2) - jStat.betafn(alpha1, beta1);
    const aTerm = (alpha1 - alpha2) * jStat.digamma(alpha1);
    const bTerm = (beta1 - beta2) * jStat.digamma(beta1);
    const abTerm =
      (alpha2 - alpha1 + beta2 - beta1) * jStat.digamma(alpha1 + beta1);
    return lnTerm + aTerm + bTerm + abTerm;
  }

  expectedInformationGain(
    alpha: number,
    beta: number,
    muA: number,
    sigmaSqA: number,
    muB: number,
    sigmaSqB: number,
  ): number {
    const [alpha1, beta1, c] = this.updateAnnotator(
      alpha,
      beta,
      muA,
      sigmaSqA,
      muB,
      sigmaSqB,
    );
    const [muA1, muB1] = this.updateMus(
      alpha,
      beta,
      muA,
      sigmaSqA,
      muB,
      sigmaSqB,
    );
    const [sigmaSqA1, sigmaSqB1] = this.updateSigmaSqs(
      alpha,
      beta,
      muA,
      sigmaSqA,
      muB,
      sigmaSqB,
    );
    const probARankedAbove = c;

    const [alpha2, beta2, _] = this.updateAnnotator(
      alpha,
      beta,
      muB,
      sigmaSqB,
      muA,
      sigmaSqA,
    );
    const [muB2, muA2] = this.updateMus(
      alpha,
      beta,
      muB,
      sigmaSqB,
      muA,
      sigmaSqA,
    );
    const [sigmaSqB2, sigmaSqA2] = this.updateSigmaSqs(
      alpha,
      beta,
      muB,
      sigmaSqB,
      muA,
      sigmaSqA,
    );

    return (
      probARankedAbove *
        (this.divergenceGaussian(muA1, sigmaSqA1, muA, sigmaSqA) +
          this.divergenceGaussian(muB1, sigmaSqB1, muB, sigmaSqB) +
          GAMMA * this.divergenceBeta(alpha1, beta1, alpha, beta)) +
      (1.0 - probARankedAbove) *
        (this.divergenceGaussian(muA2, sigmaSqA2, muA, sigmaSqA) +
          this.divergenceGaussian(muB2, sigmaSqB2, muB, sigmaSqB) +
          GAMMA * this.divergenceBeta(alpha2, beta2, alpha, beta))
    );
  }
}
