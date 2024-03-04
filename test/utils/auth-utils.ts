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

export async function createTestUser(privilege: Role = Role.TEAM) {
  const email = `test-user-${nanoid()}@email.com`;
  const password = nanoid();

  const user = await admin.auth().createUser({
    email,
    password,
  });

  await admin.auth().setCustomUserClaims(user.uid, {
    staging: privilege,
  });

  const app = getApp();
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
