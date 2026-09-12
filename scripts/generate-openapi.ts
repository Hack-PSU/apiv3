/**
 * Emits the OpenAPI 3 document to disk without starting a server.
 * Used to drive typed client generation for @hackpsu/api-client.
 */
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "../src/app.module";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const app = await NestFactory.create(AppModule, {
    logger: ["error"],
    abortOnError: false,
  });

  const options = new DocumentBuilder()
    .setTitle("HackPSU Documentation")
    .setDescription("Official HackPSU API V3")
    .setVersion("3.0")
    .addBearerAuth()
    .addOAuth2()
    .build();

  const document = SwaggerModule.createDocument(app, options, {
    // "EventController"/"createOne" -> "event_createOne", which codegen turns
    // into readable client names (useEventCreateOne) instead of
    // useEventControllerCreateOne.
    operationIdFactory: (controllerKey, methodKey) => {
      const resource = controllerKey.replace(/Controller$/, "");
      return `${resource.charAt(0).toLowerCase()}${resource.slice(1)}_${methodKey}`;
    },
  });

  const out = path.resolve(process.argv[2] ?? "openapi.json");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(document, null, 2));

  console.log(
    `wrote ${out}: ${Object.keys(document.paths).length} paths, ` +
      `${Object.keys(document.components?.schemas ?? {}).length} schemas`,
  );

  await app.close();
  process.exit(0);
}

main().catch((err) => {
  console.error("spec generation failed:", err);
  process.exit(1);
});
