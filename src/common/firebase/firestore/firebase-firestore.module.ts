import { DynamicModule, Module, Type } from "@nestjs/common";
import * as admin from "firebase-admin";
import { FirestoreEntity } from "common/firebase/firestore/firebase-firestore.constants";

type EntitySchema = {
  schema: any;
  collection: string;
};

type EntityOrSchema = Type<unknown> | EntitySchema;

const isSchema = (entity: EntityOrSchema): entity is EntitySchema =>
  "schema" in entity;

@Module({})
export class FirebaseFirestoreModule {
  static forFeature(entities: EntityOrSchema[]): DynamicModule {
    const modelProviders = entities.map((entity) => {
      if (isSchema(entity)) {
        return {
          provide: `${FirestoreEntity}${entity.schema.name}`,
          useValue: admin.firestore().collection(entity.collection),
        };
      } else {
        return {
          provide: `${FirestoreEntity}${entity.name}`,
          useValue: admin.firestore().collection(entity.name),
        };
      }
    });

    return {
      module: FirebaseFirestoreModule,
      providers: [...modelProviders],
      exports: [...modelProviders],
    };
  }
}
