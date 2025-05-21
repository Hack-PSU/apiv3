import { ConfigModule, ConfigService } from "@nestjs/config";
import { Module } from "@nestjs/common";

import {
  appleConfig,
  ConfigToken,
  dbConfig,
  firebaseConfig,
  bucketConfig,
  sendGridConfig,
} from "common/config";
import { AnalyticsModule } from "modules/analytics/analytics.module";
import { AppleAuthModule } from "common/apple/apple-auth.module";
import { AppleModule } from "modules/apple/apple.module";
import { EventModule } from "modules/event/event.module";
import { ExtraCreditModule } from "modules/extra-credit/extra-credit.module";
import { FlagModule } from "modules/flag/flag.module";
import { GoogleCloudModule } from "common/gcp";
import { HackathonModule } from "modules/hackathon/hackathon.module";
import { JudgingModule } from "modules/judging/judging.module";
import { LocationModule } from "modules/location/location.module";
import { MailModule } from "modules/mail/mail.module";
import { NotificationModule } from "modules/notification/notification.module";
import { ObjectionModule } from "common/objection";
import { OrganizerModule } from "modules/organizer/organizer.module";
import { RegistrationModule } from "modules/registration/registration.module";
import { ScanModule } from "modules/scan/scan.module";
import { SendGridModule } from "common/sendgrid";
import { SocketModule } from "modules/socket/socket.module";
import { SponsorModule } from "modules/sponsor/sponsor.module";
import { UserModule } from "modules/user/user.module";
import { FinanceModule } from "modules/finance/finance.module";
import { WalletModule } from "modules/wallet/wallet.module";
import { EmailModule } from "modules/email/email.module";

@Module({
  imports: [
    // Configs
    ConfigModule.forRoot({
      load: [
        dbConfig,
        firebaseConfig,
        sendGridConfig,
        appleConfig,
        bucketConfig,
      ],
    }),

    // Database
    ObjectionModule.forRoot({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) =>
        configService.get(ConfigToken.DB),
      inject: [ConfigService],
    }),

    // Google Cloud
    GoogleCloudModule.forRoot({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) =>
        configService.get(ConfigToken.GCP),
      inject: [ConfigService],
    }),

    // Email and SendGrid
    SendGridModule.forRoot({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) =>
        configService.get(ConfigToken.SENDGRID),
      inject: [ConfigService],
    }),

    // Apple
    AppleAuthModule.forRoot({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) =>
        configService.get(ConfigToken.APPLE),
      inject: [ConfigService],
    }),

    // Endpoints
    HackathonModule,
    LocationModule,
    EventModule,
    UserModule,
    OrganizerModule,
    JudgingModule,
    SponsorModule,
    ScanModule,
    ExtraCreditModule,
    RegistrationModule,
    AppleModule,
    FlagModule,
    NotificationModule,
    AnalyticsModule,
    FinanceModule,
    WalletModule,
    EmailModule,

    // WebSocket
    SocketModule,

    // Mail
    MailModule,
  ],
})
export class AppModule {}
