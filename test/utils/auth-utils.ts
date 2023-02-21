import { Role } from "common/gcp";
import { nanoid } from "nanoid";
import * as admin from "firebase-admin";
import {
  getAuth,
  signInWithEmailAndPassword,
  getIdToken,
  User,
} from "@firebase/auth";

export async function createUser(privilege: Role = Role.TEAM) {
  const email = `test-user-${nanoid()}@email.com`;
  const password = nanoid();

  const user = await admin.auth().createUser({
    email,
    password,
  });

  await admin.auth().setCustomUserClaims(user.uid, {
    privilege,
  });

  const userCredential = await signInWithEmailAndPassword(
    getAuth(),
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
    privilege,
  });
}

export async function deleteUser(user: User) {
  await admin.auth().deleteUser(user.uid);
}
