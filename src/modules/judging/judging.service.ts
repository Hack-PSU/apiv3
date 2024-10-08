import { Injectable } from "@nestjs/common";
import { InjectRepository, Repository } from "common/objection";
import { Organizer } from "entities/organizer.entity";
import { Project } from "entities/project.entity";
import { Score } from "entities/score.entity";

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
    private readonly organizerRepo: Repository<Organizer>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
  ) {}

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
    // Fetch and filter organizers based on provided user IDs
    const organizers = (await this.organizerRepo.findAll().exec()).filter(
      (user) => users.includes(user.id),
    );

    if (organizers.length === 0) {
      throw new Error("No organizers available for assignment.");
    }

    // Categorize organizers by team
    const techMembers = organizers.filter((user) => user.team === "tech");
    const execMembers = organizers.filter((user) => user.team === "exec");
    const otherMembers = organizers.filter(
      (user) => user.team !== "tech" && user.team !== "exec",
    );

    // Ensure there are enough tech and exec judges
    if (techMembers.length === 0) {
      throw new Error("No tech members available for assignment.");
    }
    if (execMembers.length === 0) {
      throw new Error("No exec members available for assignment.");
    }

    // Initialize assignment counts and project maps to prevent duplicates
    const assignmentCounts: { [judgeId: string]: number } = {};
    const organizerProjectMap: { [judgeId: string]: Set<number> } = {};
    organizers.forEach((organizer) => {
      assignmentCounts[organizer.id] = 0;
      organizerProjectMap[organizer.id] = new Set();
    });

    // Fetch all projects
    const projects = await this.projectRepo.findAll().byHackathon().execute();

    if (projects.length === 0) {
      throw new Error("No projects available for assignment.");
    }

    const assignments: JudgeAssignment[] = [];

    // Function to assign projects to a group of organizers
    const assignProjectsToGroup = (
      group: Organizer[],
      projectsPerUser: number,
      assignments: JudgeAssignment[],
      assignmentCounts: { [judgeId: string]: number },
      organizerProjectMap: { [judgeId: string]: Set<number> },
      category: string,
    ) => {
      const numOrganizers = group.length;
      const numProjects = projects.length;

      if (numOrganizers === 0) return;

      // Initialize counter for the group
      let counter = 0;

      group.forEach((organizer, index) => {
        for (let i = 0; i < projectsPerUser; i++) {
          const projectIndex = (counter + i) % numProjects;
          const project = projects[projectIndex];

          // Prevent duplicate assignments
          if (!organizerProjectMap[organizer.id].has(project.id)) {
            assignments.push({
              judgeId: organizer.id,
              projectId: project.id,
              hackathonId: project.hackathonId,
            });
            assignmentCounts[organizer.id] += 1;
            organizerProjectMap[organizer.id].add(project.id);
          }
        }
        counter += projectsPerUser;
      });
    };

    // Assign projects to tech members
    assignProjectsToGroup(
      techMembers,
      projectsPerUser,
      assignments,
      assignmentCounts,
      organizerProjectMap,
      "tech",
    );

    // Assign projects to exec members
    assignProjectsToGroup(
      execMembers,
      projectsPerUser,
      assignments,
      assignmentCounts,
      organizerProjectMap,
      "exec",
    );

    // Assign projects to other members
    assignProjectsToGroup(
      otherMembers,
      projectsPerUser,
      assignments,
      assignmentCounts,
      organizerProjectMap,
      "other",
    );

    const uniqueAssignments: JudgeAssignment[] = [];
    const seen: Set<string> = new Set();
    for (const assignment of assignments) {
      const key = `${assignment.judgeId}-${assignment.projectId}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueAssignments.push(assignment);
      }
    }

    return uniqueAssignments;
  }

  async reassignJudge(judgeId: string, excludeProjects: number[]) {
    const unassignedProjects = await this.getUnassignedProjects();
    const validUnassignedProjects = unassignedProjects.filter(
      (p) => !excludeProjects.includes(p.id),
    );

    if (validUnassignedProjects.length > 0) {
      const projectIdx = Math.floor(
        Math.random() * validUnassignedProjects.length,
      );
      return { judgeId, projectId: validUnassignedProjects[projectIdx].id };
    } else {
      const minCountProjects = await this.getMinCountProjects(
        judgeId,
        excludeProjects,
      );

      if (minCountProjects.length > 0) {
        const projectIdx = Math.floor(Math.random() * minCountProjects.length);
        return { judgeId, projectId: minCountProjects[projectIdx] };
      } else {
        return null;
      }
    }
  }
}
