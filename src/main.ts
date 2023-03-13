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
    .addBearerAuth()
    .addOAuth2()
    .build();

  const document = SwaggerModule.createDocument(app, options);

  await DocsModule.setup("/docs", app, document);

  const configService = await app.get<ConfigService>(ConfigService);

  if (configService.get("ALLOW_CORS")) {
    app.enableCors();
  }

  await app.listen(parseInt(configService.get("PORT")) || 3000);
}

bootstrap();
