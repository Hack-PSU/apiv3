import { registerAs } from "@nestjs/config";
import { ConfigToken } from "common/config/config.constants";
import { FirebaseConfig } from "common/gcp";
import * as admin from "firebase-admin";

export const firebaseConfig = registerAs<FirebaseConfig>(
  ConfigToken.GCP,
  () => {
    // For local testing only: use service account for credentials.
    // Ideally, we *should* be able to pass our own developer Application Default credentials
    // into this instead of needing a service account. However, this turned out to be finnicky
    // at the time, so we have opted to keep it like this for now.
    // TODO: Figure out how to pass system application default credentials to this for local testing.
    if (process.env.GOOGLE_CERT) {
      const serviceAccount = require(process.env.GOOGLE_CERT);
      return {
        credential: admin.credential.cert(serviceAccount),
        storageBucket: `${process.env.STORAGE_BUCKET}.appspot.com`,
      };
    } else {
      // Otherwise, use Application Default credentials. This should happen on the Cloud Run
      // instances and use the service account associated with the respective instance.
      return {
        credential: admin.credential.applicationDefault(),
        projectId: process.env.GOOGLE_CLOUD_PROJECT,
        storageBucket: `${process.env.STORAGE_BUCKET}.appspot.com`,
      };
    }
  },
);
