import { Injectable } from "@nestjs/common";
import multer, { Multer } from "multer";
@Injectable()
export class ProjectService {
    async parseProjectFile(file: Express.Multer.File) {
        // TODO
    }
}