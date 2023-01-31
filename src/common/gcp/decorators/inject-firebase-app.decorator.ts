import { Inject } from "@nestjs/common";
import { FirebaseAppProvider } from "common/gcp";

export const InjectFirebaseApp = () => Inject(FirebaseAppProvider);
