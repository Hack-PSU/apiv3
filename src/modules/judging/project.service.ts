import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { OmitType } from "@nestjs/swagger";
import { InjectRepository, Repository } from "common/objection";
import { Hackathon } from "entities/hackathon.entity";
import { Project, ProjectEntity } from "entities/project.entity";
import { parse } from "csv-parse/sync";

class ProjectCreateEntity extends OmitType(ProjectEntity, ["id"] as const) {}

@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(Hackathon)
    private readonly hackathonRepo: Repository<Hackathon>,
  ) {}
  parseCsv(csv: string, hackathonId: string): ProjectCreateEntity[] {
    const results: ProjectCreateEntity[] = [];
    const requiredFields = [
      "Project Title",
      "Submission Url",
      "Project Status",
      "Judging Status",
      "Highest Step Completed",
      "Project Created At",
      "About The Project",
      '"Try it out" Links',
      "Video Demo Link",
      "Opt-In Prizes",
      "Built With",
      "Notes",
      "Team Colleges/Universities",
      "Additional Team Member Count",
    ];

    try {
      const records = parse(csv, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });

      for (const record of records) {
        if (this.isValidCsvFormat(record, requiredFields)) {
          if (record["Highest Step Completed"] === "Submit") {
            results.push(
              this.mapDataToProjectCreateEntity(record, hackathonId),
            );
          }
        } else {
          throw new HttpException(
            `CSV is missing required fields: ${requiredFields.join(", ")}`,
            HttpStatus.BAD_REQUEST,
          );
        }
      }
    } catch (error) {
      console.log(error);
      throw new HttpException("Failed to parse CSV", HttpStatus.BAD_REQUEST);
    }

    return results;
  }

  private isValidCsvFormat(data: any, requiredFields: string[]): boolean {
    return requiredFields.every((field) => field in data);
  }

  private mapDataToProjectCreateEntity(
    data: any,
    hackathonId: string,
  ): ProjectCreateEntity {
    const hackPSUCategories = new Map([
      ["Entrepreneurship Award", "challenge1"],
      ["Sustainability Award", "challenge2"],
      ["Generative AI Award", "challenge3"],
    ]);

    let categoriesToAdd = "";

    data["Opt-In Prizes"].split(",").forEach((prize) => {
      prize = prize.trim();
      if (hackPSUCategories.has(prize)) {
        categoriesToAdd += hackPSUCategories.get(prize) + ",";
      }
    });

    return {
      name: data["Project Title"],
      hackathonId: hackathonId,
      categories: categoriesToAdd,
    };
  }
}
