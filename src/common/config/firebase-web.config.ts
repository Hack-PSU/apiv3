import { registerAs } from "@nestjs/config";
import { ConfigToken } from "common/config/config.constants";
import { FirebaseOptions } from "@firebase/app";

export const firebaseWebConfig = registerAs<FirebaseOptions>(
  ConfigToken.FirebaseWeb,
  () => ({
    apiKey: process.env.FIREBASE_API_KEY,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    appId: process.env.FIREBASE_APP_ID,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    databaseUrl: process.env.FIREBASE_DATABASE_URL,
    projectId: process.env.FIREBASE_PROJECT_ID,
  }),
);
