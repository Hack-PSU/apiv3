import { Injectable } from "@nestjs/common";
import { OmitType } from "@nestjs/swagger";
import { InjectRepository, Repository } from "common/objection";
import { parse } from "csv-parse"
import { Project, ProjectEntity } from "entities/project.entity";

class ProjectCreateEntity extends OmitType(ProjectEntity, ["id"] as const) {}

@Injectable()
export class ProjectService {
    constructor(
        @InjectRepository(Project)
        private readonly projectRepo: Repository<Project>,
    ) {}

    async parseProjectFile(file: Express.Multer.File) {
        let records = []

        parse(file.buffer.toString(), {
            delimiter: ",",
        })
            .on("data", (row) => {
                // console.log(row)
                records.push(row)
            })
            .on("end", () => {
                parsedCsv(records, this.projectRepo)
            })
            .on("error", (err) => {
                console.error(err)
            })

        async function parsedCsv(arr: any[], projectRepo: Repository<Project>) {
            arr.shift()
            console.log(arr[0])
            for (const element of arr) {
                projectRepo.createOne({
                    name: element[0],
                    categories: element[9],
                }).byHackathon()
            }
        }
    }
}