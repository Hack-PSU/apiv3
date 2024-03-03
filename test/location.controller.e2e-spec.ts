import * as request from "supertest";
import { app } from "./test-setup";
import {
  createTestUser,
  deleteUser,
  fetchToken,
  promoteUser,
} from "./utils/auth-utils";
import { Role } from "common/gcp";

describe("LocationController (e2e)", () => {
  let token: string;
  let user: any;

  beforeAll(async () => {
    user = await createTestUser();
  });

  afterAll(async () => {
    await deleteUser(user);
  });

  describe("/locations (GET)", () => {
    it("should return all locations", async () => {
      await promoteUser(user, Role.TEAM);
      token = await fetchToken(user);

      const response = await request(app.getHttpServer())
        .get("/locations")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(response.body).toBeTruthy();
    });
  });

  describe("/locations (POST)", () => {
    it("should create a new location", async () => {
      const newLocation = { name: "New Location" };

      await promoteUser(user, Role.TEAM);
      token = await fetchToken(user);

      const response = await request(app.getHttpServer())
        .post("/locations")
        .send(newLocation)
        .set("Authorization", `Bearer ${token}`)
        .expect(201);

      expect(response.body).toHaveProperty("id");
      expect(response.body.name).toEqual(newLocation.name);
    });
  });
});
