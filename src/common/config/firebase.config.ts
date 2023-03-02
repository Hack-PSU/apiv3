import { registerAs } from "@nestjs/config";
import { ConfigToken } from "common/config/config.constants";
import { FirebaseConfig } from "common/gcp";
import * as admin from "firebase-admin";

export const firebaseConfig = registerAs<FirebaseConfig>(
  ConfigToken.GCP,
  () => {
    if (process.env.GOOGLE_CERT) {
      let serviceAccount: any;

      if (process.env.NODE_ENV && process.env.NODE_ENV === "production") {
        serviceAccount = process.env.GOOGLE_CERT;
      } else {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        serviceAccount = require(process.env.GOOGLE_CERT);
      }

      return {
        credential: admin.credential.cert(serviceAccount),
        storageBucket: `${process.env.STAGING_STORAGE}.appspot.com`,
      };
    } else {
      return {
        credential: admin.credential.applicationDefault(),
      };
    }
  },
);
