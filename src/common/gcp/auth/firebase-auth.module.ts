import { Module } from "@nestjs/common";
import { FirebaseAuthService } from "./firebase-auth.service";
import { HttpModule } from "@nestjs/axios";
import { PassportModule } from "@nestjs/passport";
import { FirebaseAuthStrategy } from "common/gcp/auth/firebase-auth.strategy";
import { APP_GUARD } from "@nestjs/core";
import { RolesGuard } from "common/gcp/auth/roles.guard";
import { ConfigModule } from "@nestjs/config";

@Module({
  imports: [
    ConfigModule,
    HttpModule,
    PassportModule.register({ defaultStrategy: "jwt" }),
  ],
  providers: [
    FirebaseAuthService,
    FirebaseAuthStrategy,
    {
      provide: APP_GUARD,
      // Guard applied globally
      // Global guards not injected into WS gateways
      useClass: RolesGuard,
    },
  ],
  exports: [FirebaseAuthService],
})
export class FirebaseAuthModule {}
