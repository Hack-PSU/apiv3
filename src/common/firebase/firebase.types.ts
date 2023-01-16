import { AppOptions } from "firebase-admin";

export type FirebaseConfig = AppOptions & {
  appName?: string;
};

export type FirebaseCoreModuleOptions = {
  imports?: any[];
  useFactory: (...args: any[]) => FirebaseConfig;
  inject?: any[];
};
