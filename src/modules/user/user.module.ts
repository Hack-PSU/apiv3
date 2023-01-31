import { Module } from "@nestjs/common";
import { ObjectionModule } from "common/objection";
import { User } from "entities/user.entity";
import { UserController } from "./user.controller";
import { UserService } from "./user.service";

@Module({
  imports: [ObjectionModule.forFeature([User])],
  providers: [UserService],
  controllers: [UserController],
})
export class UserModule {}
