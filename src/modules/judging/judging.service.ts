import { Injectable } from "@nestjs/common";
import { InjectRepository, Repository } from "common/objection";
import { Organizer } from "entities/organizer.entity";
import { Project } from "entities/project.entity";
import { Score } from "entities/score.entity";
import * as _ from "lodash";

interface JudgeAssignment {
  judgeId: string;
  projectId: number;
  hackathonId: string;
}

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
}
