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
  methodsWithId: string[],
) {
  // Prepare test cases
  return methodsWithId.map((method) => {
    const path = `${basePath}${
      methodsWithId.includes(method) ? `/${resourceId}` : ""
    }`;
    return { method, path };
  });
}

export function testInvalidData(
  app: any,
  basePath: string,
  method: Routes,
  token: string,
  invalidData: any,
) {
  it(`${basePath} (${method}) with invalid data should fail`, async () => {
    await request(app.getHttpServer())
      [method.toLowerCase()](basePath)
      .send(invalidData)
      .set("Authorization", `Bearer ${token}`)
      .expect(400);
  });
}
