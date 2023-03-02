import { registerAs } from "@nestjs/config";
import { ConfigToken } from "common/config/config.constants";
import { FirebaseConfig } from "common/gcp";
import * as admin from "firebase-admin";

export const firebaseConfig = registerAs<FirebaseConfig>(
  ConfigToken.GCP,
  () => {
    if (process.env.GOOGLE_CERT) {
      if (process.env.NODE_ENV && process.env.NODE_ENV === "production") {
        console.log(process.env.GOOGLE_CERT_PRIVATE_KEY);
        return {
          credential: admin.credential.cert({
            projectId: process.env.GOOGLE_CERT_PROJECT_ID,
            privateKey: process.env.GOOGLE_CERT_PRIVATE_KEY
              ? JSON.parse(String(process.env.GOOGLE_CERT_PRIVATE_KEY))
              : undefined,
            clientEmail: process.env.GOOGLE_CERT_CLIENT_EMAIL,
          }),
          storageBucket: `${process.env.STAGING_STORAGE}.appspot.com`,
        };
      } else {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const serviceAccount = require(process.env.GOOGLE_CERT);
        return {
          credential: admin.credential.cert(serviceAccount),
          storageBucket: `${process.env.STAGING_STORAGE}.appspot.com`,
        };
      }
    } else {
      return {
        credential: admin.credential.applicationDefault(),
      };
    }
  },
);
