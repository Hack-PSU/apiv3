import { User } from "@firebase/auth";
import { INestApplication } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { ConfigToken, firebaseWebConfig } from "common/config";
import { Role } from "common/gcp";
import { createTestUser, deleteUser, fetchToken } from "./utils/auth-utils";
import { AppModule } from "../src/app.module";

export let moduleFixture: TestingModule;
export let app: INestApplication;
export let testTeamToken: string;
export let testNoneToken: string;
export let testExecToken: string;
let testTeamUser: User;
let testNoneUser: User;
let testExecUser: User;

jest.setTimeout(30000);

async function initializeTestApp() {
  moduleFixture = await Test.createTestingModule({
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
  await moduleFixture.close();
}

beforeAll(async () => {
  await initializeTestApp();
});

afterAll(async () => {
  await cleanupTestApp();
});
