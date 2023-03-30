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
      .where("scores.project_id", null);
  }

  async getMinCountProjects(excludeProjects: number[]) {
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
      .count("scores.projectId", { as: "count" })
      .groupBy("projects.id")
      .having("count", "=", minCountQuery)
      .select("projects.id");

    return minCountProjects.map((c) => c.id);
  }

  createAssignments(
    users: string[],
    projects: number[],
    projectsPerUser: number,
  ) {
    const randomProjects = this.shuffleProjects(projects);

    const assignments: JudgeAssignment[] = [];
    let projectIdx = 0;

    for (const judge of users) {
      for (let i = 0; i < projectsPerUser; i++, projectIdx++) {
        assignments.push({
          judgeId: judge,
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
      const minCountProjects = await this.getMinCountProjects(excludeProjects);
      const projectIdx = _.random(minCountProjects.length - 1);

      return { judgeId, projectId: minCountProjects[projectIdx] };
    }
  }
}
