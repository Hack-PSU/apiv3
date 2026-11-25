import { Module } from "@nestjs/common";
import { ObjectionModule } from "common/objection";
import { BugReport } from "entities/bug-report.entity";
import { BugReportController } from "./bug-report.controller";

@Module({
  imports: [ObjectionModule.forFeature([BugReport])],
  controllers: [BugReportController],
})
export class BugReportModule {}