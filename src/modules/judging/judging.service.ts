import { Injectable } from "@nestjs/common";
import { InjectRepository, Repository } from "common/objection";
import { Score } from "entities/score.entity";
import { Organizer } from "entities/organizer.entity";
import { Project } from "entities/project.entity";
import * as _ from "lodash";

interface JudgeAssignment {
  judgeId: string;
  projectId: number;
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

  private shuffleProjects(projects: number[]) {
    for (let i = projects.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [projects[i], projects[j]] = [projects[j], projects[i]];
    }

    return projects;
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

  async createAssignments(
    users: string[],
    projects: number[],
    projectsPerUser: number,
  ) {
    const organizers = (await this.userRepo.findAll().exec()).filter((user) =>
      users.includes(user.id),
    );

    const awards = [
      {
        name: "Sustainability",
        judgingLocation: "Room 126",
      },
      {
        name: "Entrepreneurship",
        judgingLocation: "Room 124",
      },
      {
        name: "Generative AI",
        judgingLocation: "Auditorium",
      },
    ];
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

    const randomProjects = this.shuffleProjects(projects);

    const assignments: JudgeAssignment[] = [];
    let projectIdx = 0;

    for (const judge of techMembers) {
      for (let i = 0; i < projectsPerUser; i++, projectIdx++) {
        assignments.push({
          judgeId: judge.id,
          projectId: randomProjects[projectIdx % randomProjects.length],
        });
      }
    }
    for (const judge of execMembers) {
      for (let i = 0; i < projectsPerUser; i++, projectIdx++) {
        assignments.push({
          judgeId: judge.id,
          projectId: randomProjects[projectIdx % randomProjects.length],
        });
      }
    }
    for (const judge of otherMembers) {
      for (let i = 0; i < projectsPerUser; i++, projectIdx++) {
        assignments.push({
          judgeId: judge.id,
          projectId: randomProjects[projectIdx % randomProjects.length],
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
