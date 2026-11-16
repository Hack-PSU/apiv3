/**
 * Emits the OpenAPI 3 document to disk without starting a server.
 * Used to drive typed client generation for @hackpsu/api-client.
 */
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "../src/app.module";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

/**
 * Building the document only needs Nest to construct the module graph so the
 * Swagger decorators can be read. Nothing connects to a database, Firebase or
 * SendGrid. A few providers do validate their configuration in the constructor
 * though, so supply placeholders for anything that would otherwise throw. Real
 * values, when present in a developer's .env, are left untouched.
 *
 * Returns a cleanup function for any temporary files created.
 */
function applyPlaceholderConfig(): () => void {
  const placeholders: Record<string, string> = {
    // FirebaseAuthService rejects anything outside "production" | "staging".
    AUTH_ENVIRONMENT: "production",
    RUNTIME_INSTANCE: "local",
  };

  for (const [key, value] of Object.entries(placeholders)) {
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }

  // AppleWalletService reads its certificates with readFileSync in the
  // constructor and re-throws when they are missing. The files are gitignored,
  // so CI has none. It only stores the bytes at construction, never parses
  // them, which makes empty stand-ins sufficient to build the document.
  if (process.env.APPLE_SIGNER_KEY_PASSPHRASE) {
    return () => undefined;
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hackpsu-openapi-"));
  const certs: Array<[string, string]> = [
    ["APPLE_WWDR_CERT_PATH", "wwdr.cer"],
    ["APPLE_SIGNER_CERT_PATH", "signerCert.pem"],
    ["APPLE_SIGNER_KEY_PATH", "signerKey.pem"],
  ];

  for (const [envVar, filename] of certs) {
    const file = path.join(dir, filename);
    fs.writeFileSync(file, "");
    process.env[envVar] = file;
  }
  process.env.APPLE_SIGNER_KEY_PASSPHRASE = "placeholder";

  return () => fs.rmSync(dir, { recursive: true, force: true });
}

async function main() {
  const cleanup = applyPlaceholderConfig();

  const app = await NestFactory.create(AppModule, {
    // Providers such as AppleWalletService log a failure when their credentials
    // are absent. That is expected here and does not affect the document.
    logger: false,
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
  cleanup();
  process.exit(0);
}

main().catch((err) => {
  console.error("spec generation failed:", err);
  process.exit(1);
});
