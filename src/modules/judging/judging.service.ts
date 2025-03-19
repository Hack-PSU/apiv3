import { Injectable } from "@nestjs/common";
import { InjectRepository, Repository } from "common/objection";
import { Organizer } from "@entities/organizer.entity";
import { Project } from "@entities/project.entity";
import { Score } from "@entities/score.entity";

export interface JudgeAssignment {
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

  async createAssignmentsByCategory(
    users: string[],
    reviewsPerProject: number,
  ): Promise<JudgeAssignment[]> {
    if (reviewsPerProject < 3) {
      throw new Error(
        "Each project must be reviewed by at least one exec, one tech, and one regular judge (minimum 3 reviews).",
      );
    }

    // Get all organizers filtered by the provided user IDs.
    const organizers: Organizer[] = (
      await this.organizerRepo.findAll().exec()
    ).filter((user) => users.includes(user.id));

    // Categorize judges
    const execMembers = organizers.filter((user) => user.team === "exec");
    const techMembers = organizers.filter((user) => user.team === "tech");
    const regularMembers = organizers.filter(
      (user) => user.team !== "exec" && user.team !== "tech",
    );

    if (execMembers.length === 0) {
      throw new Error("No exec judges available for assignment.");
    }
    if (techMembers.length === 0) {
      throw new Error("No tech judges available for assignment.");
    }
    if (regularMembers.length === 0) {
      throw new Error("No regular judges available for assignment.");
    }

    // Get all projects (using your hackathon filter)
    const projects = await this.projectRepo.findAll().byHackathon().execute();
    if (projects.length === 0) {
      throw new Error("No projects available for assignment.");
    }

    // Initialize assignment counts for load balancing.
    const assignmentCounts: { [judgeId: string]: number } = {};
    organizers.forEach((organizer) => (assignmentCounts[organizer.id] = 0));

    const assignments: JudgeAssignment[] = [];

    // For each project, we will guarantee one judge per category.
    for (const project of projects) {
      // Track judges already assigned to the project (to prevent duplicates).
      const projectAssigned = new Set<string>();

      // Helper function to select the judge from a group with the lowest assignment count.
      const selectJudgeFromGroup = (group: Organizer[]): Organizer => {
        // Create a shallow copy and sort by the current assignment count.
        const sorted = group
          .slice()
          .sort((a, b) => assignmentCounts[a.id] - assignmentCounts[b.id]);
        for (const judge of sorted) {
          if (!projectAssigned.has(judge.id)) {
            return judge;
          }
        }
        throw new Error(
          `Unable to assign a judge from the group for project ${project.id}`,
        );
      };

      // --- First: assign one judge from each required category ---
      const execJudge = selectJudgeFromGroup(execMembers);
      assignments.push({
        judgeId: execJudge.id,
        projectId: project.id,
        hackathonId: project.hackathonId,
      });
      assignmentCounts[execJudge.id]++;
      projectAssigned.add(execJudge.id);

      const techJudge = selectJudgeFromGroup(techMembers);
      assignments.push({
        judgeId: techJudge.id,
        projectId: project.id,
        hackathonId: project.hackathonId,
      });
      assignmentCounts[techJudge.id]++;
      projectAssigned.add(techJudge.id);

      const regJudge = selectJudgeFromGroup(regularMembers);
      assignments.push({
        judgeId: regJudge.id,
        projectId: project.id,
        hackathonId: project.hackathonId,
      });
      assignmentCounts[regJudge.id]++;
      projectAssigned.add(regJudge.id);

      // --- Second: assign any additional judges if reviewsPerProject > 3 ---
      const extraReviews = reviewsPerProject - 3;
      if (extraReviews > 0) {
        // Combine all judges and select from those with the fewest assignments.
        const allJudges = organizers;
        for (let i = 0; i < extraReviews; i++) {
          // Sort all judges by assignment count.
          const sortedAll = allJudges
            .slice()
            .sort((a, b) => assignmentCounts[a.id] - assignmentCounts[b.id]);
          let selectedJudge: Organizer | undefined = undefined;
          for (const judge of sortedAll) {
            if (!projectAssigned.has(judge.id)) {
              selectedJudge = judge;
              break;
            }
          }
          if (!selectedJudge) {
            // If all judges are already assigned to the project, you can choose to break or continue.
            break;
          }
          assignments.push({
            judgeId: selectedJudge.id,
            projectId: project.id,
            hackathonId: project.hackathonId,
          });
          assignmentCounts[selectedJudge.id]++;
          projectAssigned.add(selectedJudge.id);
        }
      }
    }
    return assignments;
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
