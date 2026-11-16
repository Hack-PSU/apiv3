import { getApp, getApps, initializeApp, type FirebaseOptions } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

/**
 * Initializes Firebase lazily.
 *
 * The previous version of this package called `initializeApp()` at module
 * scope, so merely importing the package ran Firebase: during SSR, and before
 * the app had a chance to supply config. Initialization now happens on first
 * use, from inside the provider.
 */
export function getFirebaseAuth(options: FirebaseOptions): Auth {
  const app = getApps().length > 0 ? getApp() : initializeApp(options);
  return getAuth(app);
}
