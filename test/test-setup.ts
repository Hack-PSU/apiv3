import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AppleAuthModule } from "common/apple/apple-auth.module";
import {
  dbConfig,
  firebaseConfig,
  sendGridConfig,
  appleConfig,
  resumeBucketConfig,
  ConfigToken,
} from "common/config";
import { GoogleCloudModule } from "common/gcp";
import { ObjectionModule } from "common/objection";
import { SendGridModule } from "common/sendgrid";
import { AnalyticsModule } from "modules/analytics/analytics.module";
import { AppleModule } from "modules/apple/apple.module";
import { EventModule } from "modules/event/event.module";
import { ExtraCreditModule } from "modules/extra-credit/extra-credit.module";
import { FlagModule } from "modules/flag/flag.module";
import { HackathonModule } from "modules/hackathon/hackathon.module";
import { JudgingModule } from "modules/judging/judging.module";
import { LocationModule } from "modules/location/location.module";
import { MailModule } from "modules/mail/mail.module";
import { NotificationModule } from "modules/notification/notification.module";
import { OrganizerModule } from "modules/organizer/organizer.module";
import { RegistrationModule } from "modules/registration/registration.module";
import { ScanModule } from "modules/scan/scan.module";
import { SocketModule } from "modules/socket/socket.module";
import { SponsorModule } from "modules/sponsor/sponsor.module";
import { UserModule } from "modules/user/user.module";

export let app: INestApplication;

beforeAll(async () => {
  jest.setTimeout(30000);

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [
      // Configs
      ConfigModule.forRoot({
        load: [
          dbConfig,
          firebaseConfig,
          sendGridConfig,
          appleConfig,
          resumeBucketConfig,
        ],
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
      NotificationModule,
      AnalyticsModule,

      // WebSocket
      SocketModule,

      // Mail
      MailModule,
    ],
  }).compile();

  app = moduleFixture.createNestApplication();
  await app.init();
});

afterAll(async () => {
  await app.close();
});
