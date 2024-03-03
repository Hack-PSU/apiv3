import * as request from "supertest";
import { app } from "./test-setup"; // Assuming this initializes and exports your NestJS app
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
    user = await createTestUser(); // Create a test user before all tests
  });

  afterAll(async () => {
    await deleteUser(user); // Clean up the test user after all tests
  });

  /*   describe("/locations (GET)", () => {
    it("should return all locations", async () => {
      await promoteUser(user, Role.TEAM); // Set the user role
      token = await fetchToken(user); // Fetch the authentication token

      // Make a GET request to /locations with the token
      const response = await request(app.getHttpServer())
        .get("/locations")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      // Assertions about the response
      console.log(response.body);
      expect(response.body).toBeInstanceOf(Array);
    });
  }); */

  describe("/locations (POST)", () => {
    it("should create a new location", async () => {
      const newLocation = { name: "New Location" };

      await promoteUser(user, Role.TEAM); // Ensure the user has the necessary role
      token = await fetchToken(user); // Fetch the authentication token

      // Make a POST request to /locations to create a new location
      const response = await request(app.getHttpServer())
        .post("/locations")
        .set("Authorization", `Bearer ${token}`)
        .set("Content-Type", "application/json")
        .send(newLocation)
        .expect(201); // Expect a 201 Created response

      // Assertions about the response
      expect(response.body).toHaveProperty("id");
      expect(response.body.name).toEqual(newLocation.name);
    });
  });
});
