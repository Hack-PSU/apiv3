import { Injectable } from "@nestjs/common";

import fs from "fs"
import { parse } from "csv-parse"

@Injectable()
export class ProjectService {
    async parseProjectFile(file: Express.Multer.File) {
        console.log(file.mimetype)
    }
}