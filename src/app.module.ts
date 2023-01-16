import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { ObjectionModule } from "common/objection";
import { HackathonModule } from "modules/hackathon/hackathon.module";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ConfigToken, dbConfig, firebaseConfig } from "common/config";
import { LocationModule } from "modules/location/location.module";
import { EventModule } from "modules/event/event.module";
import { UserModule } from "modules/user/user.module";
import { FirebaseModule } from "common/firebase";

@Module({
  imports: [
    // Configs
    ConfigModule.forRoot({
      load: [dbConfig, firebaseConfig],
    }),

    // Database
    ObjectionModule.forRoot({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) =>
        configService.get(ConfigToken.DB),
      inject: [ConfigService],
    }),

    // Firebase
    FirebaseModule.forRoot({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) =>
        configService.get(ConfigToken.FIREBASE),
      inject: [ConfigService],
    }),

    // Endpoints
    HackathonModule,
    LocationModule,
    EventModule,
    UserModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
