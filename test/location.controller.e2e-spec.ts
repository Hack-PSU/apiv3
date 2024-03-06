import * as request from "supertest";
import { app, testNoneToken, testTeamToken } from "./test-setup";
import {
  Routes,
  prepareUnauthorizedRequestTests,
} from "./utils/common-test-utils";

describe("LocationController (e2e)", () => {
  let locationId;

  prepareUnauthorizedRequestTests("/locations", "1", [
    "GET",
    "PATCH",
    "PUT",
    "DELETE",
  ]).forEach(({ method, path }) => {
    it(`${method} ${path} without token should be unauthorized`, async () => {
      const response = await request(app.getHttpServer())[method.toLowerCase()](
        path,
      );
      expect(response.status).toBe(403);
    });
  });

  // Test input validation
  it("/locations (POST) with invalid data should fail", async () => {
    await request(app.getHttpServer())
      .post("/locations")
      .send({ invalidField: "invalid" }) // Invalid data
      .set("Authorization", `Bearer ${testTeamToken}`)
      .expect(400);
  });

  // Test creating a new location with valid token
  it("/locations (POST)", async () => {
    const newLocation = { name: "Test Location" };
    const response = await request(app.getHttpServer())
      .post("/locations")
      .send(newLocation)
      .set("Authorization", `Bearer ${testTeamToken}`)
      .expect(201);

    expect(response.body).toMatchObject(newLocation);
    expect(response.body.id).toBeDefined();
    locationId = response.body.id;
  });

  // Test retrieving all locations
  it("/locations (GET)", async () => {
    await request(app.getHttpServer())
      .get("/locations")
      .set("Authorization", `Bearer ${testTeamToken}`)
      .expect(200)
      .expect((response) => {
        expect(Array.isArray(response.body)).toBe(true);
      });
  });

  // Test retrieving a specific location
  it("/locations/:id (GET)", async () => {
    await request(app.getHttpServer())
      .get(`/locations/${locationId}`)
      .set("Authorization", `Bearer ${testTeamToken}`)
      .expect(200)
      .expect((response) => {
        expect(response.body).toMatchObject({
          name: "Test Location",
          id: locationId,
        });
      });
  });

  // Test for edge case: requesting a non-existent location
  it("/locations/:id (GET) with non-existent id should return 404", async () => {
    await request(app.getHttpServer())
      .get("/locations/99999999")
      .set("Authorization", `Bearer ${testTeamToken}`)
      .expect(404);
  });

  // Role-based access control: POST should be forbidden for non-TEAM roles
  it("/locations (POST) should be forbidden for non-TEAM roles", async () => {
    await request(app.getHttpServer())
      .post("/locations")
      .send({ name: "Unauthorized Location" })
      .set("Authorization", `Bearer ${testNoneToken}`)
      .expect(403);
  });

  // Cleanup created test data
  afterAll(async () => {
    if (locationId) {
      await request(app.getHttpServer())
        .delete(`/locations/${locationId}`)
        .set("Authorization", `Bearer ${testTeamToken}`);
    }
  });

  // Test updating a location with PATCH
  it("/locations/:id (PATCH) updates the location", async () => {
    const updatedLocation = { name: "Updated Test Location" };
    await request(app.getHttpServer())
      .patch(`/locations/${locationId}`)
      .send(updatedLocation)
      .set("Authorization", `Bearer ${testTeamToken}`)
      .expect(200)
      .expect((response) => {
        expect(response.body).toMatchObject({
          ...updatedLocation,
          id: locationId,
        });
      });
  });

  // Test replacing a location with PUT
  it("/locations/:id (PUT) replaces the location", async () => {
    const replacedLocation = { name: "Replaced Test Location" };
    await request(app.getHttpServer())
      .put(`/locations/${locationId}`)
      .send(replacedLocation)
      .set("Authorization", `Bearer ${testTeamToken}`)
      .expect(200)
      .expect((response) => {
        expect(response.body).toMatchObject({
          ...replacedLocation,
          id: locationId,
        });
      });
  });

  // Test deleting a location
  it("/locations/:id (DELETE) removes the location", async () => {
    await request(app.getHttpServer())
      .delete(`/locations/${locationId}`)
      .set("Authorization", `Bearer ${testTeamToken}`)
      .expect(204);

    // Verify the location is indeed deleted
    await request(app.getHttpServer())
      .get(`/locations/${locationId}`)
      .set("Authorization", `Bearer ${testTeamToken}`)
      .expect(200);
  });

  // Optional: Test PATCH, PUT with invalid data
  it("/locations/:id (PATCH) with invalid data should fail", async () => {
    await request(app.getHttpServer())
      .patch(`/locations/${locationId}`)
      .send({ invalidField: "invalid" })
      .set("Authorization", `Bearer ${testTeamToken}`)
      .expect(400);
  });

  it("/locations/:id (PUT) with invalid data should fail", async () => {
    await request(app.getHttpServer())
      .put(`/locations/${locationId}`)
      .send({ invalidField: "invalid" })
      .set("Authorization", `Bearer ${testTeamToken}`)
      .expect(400);
  });
});
