import {
  getAuth,
  signInWithEmailAndPassword,
  getIdToken,
  User,
} from "@firebase/auth";
import * as admin from "firebase-admin";
import { nanoid } from "nanoid";

import { Role } from "common/gcp";

import { getApps, getApp, initializeApp } from "firebase/app";

export async function createTestUser(
  firebaseConfig,
  privilege: Role = Role.TEAM,
) {
  function ensureFirebaseApp() {
    if (getApps().length === 0) {
      return initializeApp(firebaseConfig);
    }
    return getApp();
  }

  const email = `test-user-${nanoid()}@email.com`;
  const password = nanoid();

  const user = await admin.auth().createUser({
    email,
    password,
  });

  await admin.auth().setCustomUserClaims(user.uid, {
    staging: privilege,
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
