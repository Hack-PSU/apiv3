import {
  getAuth,
  signInWithEmailAndPassword,
  getIdToken,
  User,
} from "@firebase/auth";
import * as admin from "firebase-admin";
import { nanoid } from "nanoid";
import { initializeApp } from "@firebase/app";

import { Role } from "common/gcp";
import { getApps, getApp } from "firebase/app";

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
};

function ensureFirebaseApp() {
  if (getApps().length === 0) {
    return initializeApp(firebaseConfig);
  }
  return getApp();
}

export async function createTestUser(privilege: Role = Role.TEAM) {
  const email = `test-user-${nanoid()}@email.com`;
  const password = nanoid();

  const user = await admin.auth().createUser({
    email,
    password,
  });

  await admin.auth().setCustomUserClaims(user.uid, {
    staging: Role.NONE,
  });

  const app = ensureFirebaseApp();
  const auth = getAuth(app);

  const userCredential = await signInWithEmailAndPassword(
    auth,
    email,
    password,
  );

  return userCredential.user;
}

export async function fetchToken(user: User) {
  return getIdToken(user, true);
}

export async function promoteUser(user: User, privilege: Role) {
  await admin.auth().setCustomUserClaims(user.uid, {
    staging: privilege,
  });
}

export async function deleteUser(user: User) {
  await admin.auth().deleteUser(user.uid);
}
