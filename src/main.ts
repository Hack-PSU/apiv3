import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { DocsModule } from "common/docs/docs.module";
import { ConfigService } from "@nestjs/config";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const options = new DocumentBuilder()
    .setTitle("HackPSU Documentation")
    .setDescription("Official HackPSU API V3")
    .setVersion("3.0")
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description:
          "Enter your Firebase JWT token in the format **token&gt;**",
      },
      "firebase",
    )
    .addOAuth2()
    .build();

  const document = SwaggerModule.createDocument(app, options);

  SwaggerModule.setup("/docs", app, document);

  await DocsModule.setup("/docs-legacy", app, document);

  const configService = await app.get<ConfigService>(ConfigService);

  if (configService.get("ALLOW_CORS") === "true") {
    app.enableCors();
  }

  if (configService.get("ALLOW_CORS") === "prod") {
    app.enableCors({
      origin: new RegExp(/^(https:\/\/([^.]*\.)?hackpsu.org)$/, "i"),
    });
  }

  await app.listen(parseInt(configService.get("PORT")) || 3000);
}

bootstrap();
