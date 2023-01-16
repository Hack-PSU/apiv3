import { DynamicModule, Global, Module, Provider } from "@nestjs/common";
import * as admin from "firebase-admin";
import { FirebaseConfig, FirebaseCoreModuleOptions } from "./firebase.types";
import {
  FirebaseAppProvider,
  FirebaseConfigProvider,
} from "./firebase.constants";
import { FirebaseAuthModule } from "common/firebase/auth";

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
      imports: [...options.imports, FirebaseAuthModule],
      providers: [firebaseConfigProvider, firebaseAppProvider],
      exports: [firebaseAppProvider],
    };
  }
}
