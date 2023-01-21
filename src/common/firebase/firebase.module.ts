import { DynamicModule, Global, Module, Provider } from "@nestjs/common";
import * as admin from "firebase-admin";
import { FirebaseConfig, FirebaseCoreModuleOptions } from "./firebase.types";
import {
  FirebaseAppProvider,
  FirebaseConfigProvider,
} from "./firebase.constants";
import { FirebaseAuthModule, FirebaseAuthService } from "common/firebase/auth";
import { HttpModule } from "@nestjs/axios";

// FirebaseModule is a global module that allows FirebaseAuth to be injected
// into submodules.

@Global()
@Module({})
export class FirebaseModule {
  static forRoot(options: FirebaseCoreModuleOptions): DynamicModule {
    const firebaseConfigProvider: Provider<FirebaseConfig> = {
      provide: FirebaseConfigProvider,
      useFactory: options.useFactory,
      inject: options.inject,
    };

    const firebaseAppProvider: Provider<admin.app.App> = {
      provide: FirebaseAppProvider,
      useFactory: ({ appName, ...config }: FirebaseConfig) =>
        admin.initializeApp(config, appName),
      inject: [FirebaseConfigProvider],
    };

    return {
      module: FirebaseModule,
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
