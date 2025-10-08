import { Module } from "@nestjs/common";
import { GoogleDriveModule } from "common/gcp/drive";
import { DriveController } from "./drive.controller";

@Module({
  imports: [GoogleDriveModule],
  controllers: [DriveController],
})
export class DriveModule {}
