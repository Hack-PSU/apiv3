import { Module } from "@nestjs/common";
import { ObjectionModule } from "common/objection";
import { HackathonModule } from "modules/hackathon/hackathon.module";
import { ConfigModule, ConfigService } from "@nestjs/config";
import {
  ConfigToken,
  dbConfig,
  firebaseConfig,
  sendGridConfig,
} from "common/config";
import { LocationModule } from "modules/location/location.module";
import { EventModule } from "modules/event/event.module";
import { UserModule } from "modules/user/user.module";
import { GoogleCloudModule } from "common/gcp";
import { SocketModule } from "modules/socket/socket.module";
import { OrganizerModule } from "modules/organizer/organizer.module";
import { MailModule } from "modules/mail/mail.module";
import { JudgingModule } from "modules/judging/judging.module";
import { SponsorModule } from "modules/sponsor/sponsor.module";
import { ScanModule } from "modules/scan/scan.module";
import { ExtraCreditModule } from "modules/extra-credit/extra-credit.module";
import { SendGridModule } from "common/sendgrid";
import { RegistrationModule } from "modules/registration/registration.module";
import { AppleAuthModule } from "common/apple/apple-auth.module";
import { AppleModule } from "modules/apple/apple.module";
import { FlagModule } from "modules/flag/flag.module";
import { appleConfig } from "common/config/apple.config";

@Module({
  imports: [
    // Configs
    ConfigModule.forRoot({
      load: [dbConfig, firebaseConfig, sendGridConfig, appleConfig],
    }),

    // Database
    ObjectionModule.forRoot({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) =>
        configService.get(ConfigToken.DB),
      inject: [ConfigService],
    }),

    // Google Cloud
    GoogleCloudModule.forRoot({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) =>
        configService.get(ConfigToken.GCP),
      inject: [ConfigService],
    }),

    // Email and SendGrid
    SendGridModule.forRoot({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) =>
        configService.get(ConfigToken.SENDGRID),
      inject: [ConfigService],
    }),

    // Apple
    AppleAuthModule.forRoot({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) =>
        configService.get(ConfigToken.APPLE),
      inject: [ConfigService],
    }),

    // Endpoints
    HackathonModule,
    LocationModule,
    EventModule,
    UserModule,
    OrganizerModule,
    JudgingModule,
    SponsorModule,
    ScanModule,
    ExtraCreditModule,
    RegistrationModule,
    AppleModule,
    FlagModule,

    // WebSocket
    SocketModule,

    // Mail
    MailModule,
  ],
})
export class AppModule {}
