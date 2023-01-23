import { Module } from "@nestjs/common";
import { ProjectController } from "modules/judging/project.controller";

@Module({
  controllers: [ProjectController],
})
export class JudgingModule {}
