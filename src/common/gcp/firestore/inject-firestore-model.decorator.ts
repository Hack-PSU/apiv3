import { Inject, Type } from "@nestjs/common";
import { FirestoreEntity } from "./firebase-firestore.constants";

export const InjectFirestoreModel = (model: Type<unknown>) =>
  Inject(`${FirestoreEntity}${model.name}`);
