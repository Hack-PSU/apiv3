import { Module } from "@nestjs/common";
import { ObjectionModule } from "common/objection";
import { User } from "entities/user.entity";
import { UserController } from "./user.controller";
import { UserService } from "./user.service";
import { Scan } from "entities/scan.entity";
import { ExtraCreditAssignment } from "entities/extra-credit-assignment.entity";
import { ExtraCreditClass } from "entities/extra-credit-class.entity";
import { ConfigModule } from "@nestjs/config";

@Module({
  imports: [
    ObjectionModule.forFeature([
      User,
      Scan,
      ExtraCreditClass,
      ExtraCreditAssignment,
    ]),
    ConfigModule,
  ],
  providers: [UserService],
  controllers: [UserController],
})
export class UserModule {}
