import { Inject } from "@nestjs/common";
import { FirebaseAppProvider } from "common/firebase";

export const InjectFirebaseApp = () => Inject(FirebaseAppProvider);
