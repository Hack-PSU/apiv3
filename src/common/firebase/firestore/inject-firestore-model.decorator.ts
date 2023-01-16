import { Inject, Type } from "@nestjs/common";
import { FirestoreEntity } from "./firebase-firestore.constants";

export const InjectFirestoreModel = (model: Type<unknown> | string) => {
  if (typeof model === "string") {
    return Inject(`${FirestoreEntity}${model}`);
  } else {
    return Inject(`${FirestoreEntity}${model.name}`);
  }
};
