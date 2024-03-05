import * as request from "supertest";
import { app, testUserToken } from "../test/test-setup";

describe("LocationController (e2e)", () => {
  const newLocation = { name: "Test Location" };
  const updatedLocation = { name: "Updated Test Location" };
  const replacedLocation = { name: "Replaced Test Location" };
  let locationId;

  it("/locations (GET)", async () => {
    await request(app.getHttpServer())
      .get("/locations")
      .set("Authorization", `Bearer ${testUserToken}`)
      .expect(200);
  });

  it("/locations (POST)", async () => {
    const response = await request(app.getHttpServer())
      .post("/locations")
      .send(newLocation)
      .set("Authorization", `Bearer ${testUserToken}`)
      .expect(201);

    expect(response.body).toMatchObject(newLocation);
    locationId = response.body.id;
  });

  it("/locations/:id (GET)", async () => {
    await request(app.getHttpServer())
      .get(`/locations/${locationId}`)
      .set("Authorization", `Bearer ${testUserToken}`)
      .expect(200)
      .expect((response) => {
        expect(response.body).toMatchObject({ ...newLocation, id: locationId });
      });
  });

  it("/locations/:id (PATCH)", async () => {
    await request(app.getHttpServer())
      .patch(`/locations/${locationId}`)
      .send(updatedLocation)
      .expect(200)
      .set("Authorization", `Bearer ${testUserToken}`)
      .expect((response) => {
        expect(response.body).toMatchObject({
          ...updatedLocation,
          id: locationId,
        });
      });
  });

  it("/locations/:id (PUT)", async () => {
    await request(app.getHttpServer())
      .put(`/locations/${locationId}`)
      .send(replacedLocation)
      .expect(200)
      .set("Authorization", `Bearer ${testUserToken}`)
      .expect((response) => {
        expect(response.body).toMatchObject({
          ...replacedLocation,
          id: locationId,
        });
      });
  });

  it("/locations/:id (DELETE)", async () => {
    await request(app.getHttpServer())
      .delete(`/locations/${locationId}`)
      .set("Authorization", `Bearer ${testUserToken}`)
      .expect(204);

    await request(app.getHttpServer())
      .get(`/locations/${locationId}`)
      .set("Authorization", `Bearer ${testUserToken}`)
      .expect(404);
  });
});
