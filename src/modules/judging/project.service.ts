import { Injectable } from "@nestjs/common";

import fs from "fs"
import { parse } from "csv-parse"
import { lookup } from "mime";

@Injectable()
export class ProjectService {
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
                parsedCsv(records)
            })
            .on("error", (err) => {
                console.error(err)
            })

        function parsedCsv(arr: any[]) {
            
        }
    }
}