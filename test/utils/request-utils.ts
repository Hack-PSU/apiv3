import { INestApplication } from "@nestjs/common";
import * as request from "supertest";

type ClientBuilder = {
  withToken: (token: string) => request.Test;
};

export type Client = (endpoint: string) => ClientBuilder;

export function getClient(app: INestApplication): Client {
  return (endpoint: string) => ({
    withToken: (token: string) =>
      request(app.getHttpServer())
        .get(endpoint)
        .set("Authorization", `Bearer ${token}`),
  });
}
