import * as admin from "firebase-admin";

export type FirestoreModel<TEntity> =
  admin.firestore.CollectionReference<TEntity>;
