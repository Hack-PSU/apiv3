import { Module } from "@nestjs/common";
import { ObjectionModule } from "common/objection";
import { User } from "entities/user.entity";
import { UserController } from "./user.controller";

@Module({
  imports: [ObjectionModule.forFeature([User])],
  controllers: [UserController],
})
export class UserModule {}
