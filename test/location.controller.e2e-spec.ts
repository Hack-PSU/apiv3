import * as request from "supertest";
import { app } from "../test/test-setup";

describe("LocationController (e2e)", () => {
  it("/locations (GET)", async () => {
    return await request(app.getHttpServer())
      .get("/locations")
      .expect(200)
      .expect((response) => {
        expect(response.body).toBeInstanceOf(Array);
        // Additional assertions as necessary
      });
  });

  it("/locations (POST)", async () => {
    const newLocation = {
      name: "Test Location",
    };
    return await request(app.getHttpServer())
      .post("/locations")
      .send(newLocation)
      .expect(201)
      .expect((response) => {
        expect(response.body).toMatchObject(newLocation);
      });
  });

  // Add more tests for other endpoints like GET /locations/:id, PATCH /locations/:id, etc.
});
