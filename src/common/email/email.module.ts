import { Module } from "@nestjs/common";
import { EmailService } from "common/email/email.service";
import { HttpModule } from "@nestjs/axios";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ConfigToken } from "common/config";

@Module({
  imports: [
    // HttpModule.registerAsync({
    //   imports: [ConfigModule],
    //   useFactory: (configService: ConfigService) => ({
    //     auth: {
    //       username: configService.get(`${ConfigToken.MJML}.username`),
    //       password: configService.get(`${ConfigToken.MJML}.password`),
    //     },
    //     baseURL: "https://api.mjml.io/v1",
    //   }),
    //   inject: [ConfigService],
    // }),
  ],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
