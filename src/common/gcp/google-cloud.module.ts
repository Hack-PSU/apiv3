import { DynamicModule, Global, Module, Provider } from "@nestjs/common";
import * as admin from "firebase-admin";
import {
  FirebaseConfig,
  GoogleCloudCoreModuleOptions,
} from "./google-cloud.types";
import {
  FirebaseAppProvider,
  FirebaseConfigProvider,
} from "./google-cloud.constants";
import { FirebaseAuthModule, FirebaseAuthService } from "common/gcp/auth";
import { HttpModule } from "@nestjs/axios";

// FirebaseModule is a global module that allows FirebaseAuth to be injected
// into submodules.

@Global()
@Module({})
export class GoogleCloudModule {
  static forRoot(options: GoogleCloudCoreModuleOptions): DynamicModule {
    const firebaseConfigProvider: Provider<FirebaseConfig> = {
      provide: FirebaseConfigProvider,
      useFactory: options.useFactory,
      inject: options.inject,
    };

    const firebaseAppProvider: Provider<admin.app.App> = {
      provide: FirebaseAppProvider,
      useFactory: ({ appName, ...config }: FirebaseConfig) => {
        return admin.initializeApp(config, appName);
      },
      inject: [FirebaseConfigProvider],
    };

    return {
      module: GoogleCloudModule,
      imports: [...options.imports, HttpModule, FirebaseAuthModule],
      providers: [
        firebaseConfigProvider,
        firebaseAppProvider,
        FirebaseAuthService,
      ],
      exports: [firebaseAppProvider, FirebaseAuthService],
    };
  }
}
