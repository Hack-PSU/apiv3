import { DynamicModule, Module } from "@nestjs/common";
import { createObjectionProviders } from "common/objection";
import { EntityOrCustom } from "common/objection/objection.types";
import { ObjectionCoreModule } from "common/objection/objection-core.module";
import { ObjectionMockProvider } from "./objection-testing.constants";
import { Knex } from "knex";
import { ObjectionDatabaseProvider } from "common/objection/objection.constants";
import * as mockDb from "mock-knex";

@Module({})
export class ObjectionTestingModule {
  static forFeature(entities: EntityOrCustom[]): DynamicModule {
    const providers = createObjectionProviders(entities);
    return {
      module: ObjectionTestingModule,
      imports: [
        // initialize knex instance without a connection
        ObjectionCoreModule.forRoot({
          imports: [],
          useFactory: () => ({}),
          inject: [],
        }),
      ],
      providers: [
        {
          provide: ObjectionMockProvider,
          useFactory: (instance: Knex) => {
            mockDb.mock(instance);
            return instance;
          },
          inject: [ObjectionDatabaseProvider],
        },
        ...providers,
      ],
      exports: [ObjectionMockProvider, ...providers],
    };
  }
}
