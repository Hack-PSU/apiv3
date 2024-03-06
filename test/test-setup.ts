import { User } from "@firebase/auth";
import { INestApplication } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { AppleAuthModule } from "common/apple/apple-auth.module";
import {
  ConfigToken,
  appleConfig,
  dbConfig,
  firebaseConfig,
  firebaseWebConfig,
  resumeBucketConfig,
  sendGridConfig,
} from "common/config";
import { GoogleCloudModule, Role } from "common/gcp";
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
import { createTestUser, deleteUser, fetchToken } from "./utils/auth-utils";
import { AppModule } from "../src/app.module";

export let app: INestApplication;
export let testTeamToken: string;
export let testNoneToken: string;
export let testExecToken: string;
let testTeamUser: User;
let testNoneUser: User;
let testExecUser: User;

jest.setTimeout(30000);

async function initializeTestApp() {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        load: [firebaseWebConfig],
      }),
      AppModule,
    ],
  }).compile();

  testTeamUser = await createTestUser(
    moduleFixture.get(ConfigService).get(ConfigToken.FirebaseWeb),
    Role.TEAM,
  );
  testTeamToken = await fetchToken(testTeamUser);

  testNoneUser = await createTestUser(
    moduleFixture.get(ConfigService).get(ConfigToken.FirebaseWeb),
    Role.NONE,
  );

  testNoneToken = await fetchToken(testNoneUser);

  testExecUser = await createTestUser(
    moduleFixture.get(ConfigService).get(ConfigToken.FirebaseWeb),
    Role.EXEC,
  );

  testExecToken = await fetchToken(testExecUser);

  app = moduleFixture.createNestApplication();
  await app.init();
}

async function cleanupTestApp() {
  await app.close();
  await deleteUser(testTeamUser);
  await deleteUser(testNoneUser);
  await deleteUser(testExecUser);
}

beforeAll(async () => {
  await initializeTestApp();
});

afterAll(async () => {
  await cleanupTestApp();
});
