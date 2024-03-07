import * as request from "supertest";

export enum Routes {
  GET = "Get",
  POST = "Post",
  PATCH = "Patch",
  PUT = "Put",
  DELETE = "Delete",
}

export function prepareUnauthorizedRequestTests(
  basePath: string,
  resourceId = "1",
  methodsWithId: Routes[],
) {
  // Prepare test cases
  return Object.values(Routes).map((method) => {
    const path = `${basePath}${
      methodsWithId.includes(method) ? `/${resourceId}` : ""
    }`;
    console.log(`Testing ${method} ${path}`);
    return { method, path };
  });
}

export function testInvalidData(
  app: any,
  method: Routes[],
  path: string,
  token: string,
  invalidData: any,
) {
  method.forEach(async (m) => {
    it(`${m} ${path} with invalid data should fail`, async () => {
      await request(app.getHttpServer())
        [m.toLowerCase()](path)
        .send(invalidData)
        .set("Authorization", `Bearer ${token}`)
        .expect(400);
    });
  });
}
