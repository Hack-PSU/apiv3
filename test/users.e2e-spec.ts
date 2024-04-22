import { Test } from "@nestjs/testing";
import { User } from "entities/user.entity";
import { Scan } from "entities/scan.entity";
import { ExtraCreditClass } from "entities/extra-credit-class.entity";
import { ExtraCreditAssignment } from "entities/extra-credit-assignment.entity";
import { FirebaseAuthModule, FirebaseConfig, Role } from "common/gcp";
import { initializeApp } from "@firebase/app";
import { User as FirebaseUser } from "@firebase/auth";
import {
  createTestUser,
  deleteUser,
  fetchToken,
  promoteUser,
} from "./utils/auth-utils";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ConfigToken, firebaseConfig, firebaseWebConfig } from "common/config";
import { Client, getClient } from "./utils/request-utils";
import { ObjectionTestingModule } from "test/objection";
import * as admin from "firebase-admin";
import { UserModule } from "modules/user/user.module";
import { SocketModule } from "modules/socket/socket.module";
import { SocketGateway } from "modules/socket/socket.gateway";

describe("UsersController (e2e)", () => {
  let client: Client;
  let user: FirebaseUser;

  beforeAll(async () => {
    const modules = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [firebaseWebConfig, firebaseConfig],
        }),
      ],
    }).compile();

    const configService = modules.get<ConfigService>(ConfigService);

    initializeApp(configService.get(ConfigToken.FirebaseWeb));

    const { appName, ...options } = configService.get<FirebaseConfig>(
      ConfigToken.GCP,
    );

    user = await createTestUser();
  });

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [firebaseConfig],
        }),

        ObjectionTestingModule.forFeature([
          User,
          Scan,
          ExtraCreditClass,
          ExtraCreditAssignment,
        ]),

        FirebaseAuthModule,
        UserModule,
        SocketModule,
      ],
    })
      .overrideProvider(SocketGateway)
      .useValue({})
      .compile();

    const app = moduleFixture.createNestApplication();
    await app.init();

    client = getClient(app);
  });

  describe("/ (GET)", () => {
    it("should fail without permissions", async () => {
      await promoteUser(user, Role.NONE);
      const token = await fetchToken(user);

      return client("/users").withToken(token).expect(403);
    });

    it("should get all users", async () => {
      await promoteUser(user, Role.TEAM);
      const token = await fetchToken(user);

      return client("/users").withToken(token).expect(200);
    });
  });

  afterAll(async () => {
    await deleteUser(user);
  });
});

test("dummy test", () => {
  expect(1).toBe(1);
});
