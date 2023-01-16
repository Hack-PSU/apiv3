import { registerAs } from "@nestjs/config";
import { ConfigToken } from "common/config/config.constants";
import { FirebaseConfig } from "common/firebase";
import * as admin from "firebase-admin";

export const firebaseConfig = registerAs<FirebaseConfig>(
  ConfigToken.FIREBASE,
  () => {
    if (process.env.GOOGLE_CERT) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const serviceAccount = require(process.env.GOOGLE_CERT);
      return {
        credential: admin.credential.cert(serviceAccount),
      };
    } else {
      return {
        credential: admin.credential.applicationDefault(),
      };
    }
  },
);
