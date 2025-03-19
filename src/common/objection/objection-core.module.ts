import { DynamicModule, Global, Module, Provider } from "@nestjs/common";
import knex, { Knex } from "knex";
import {
  ObjectionDatabaseProvider,
  ObjectionDBConnectionProvider,
} from "./objection.constants";
import { DBConnection, ObjectionCoreModuleOptions } from "./objection.types";
import { Entity } from "@entities/base.entity";
import { knexSnakeCaseMappers } from "objection";

// Used to avoid edge-case where 2 instances are no longer singletons
// https://github.com/nestjs/typeorm/issues/514#issuecomment-640603602
// Module also used to globally share (inject) database configuration

@Global()
@Module({})
export class ObjectionCoreModule {
  static forRoot(options: ObjectionCoreModuleOptions): DynamicModule {
    const connectionProvider: Provider<DBConnection> = {
      provide: ObjectionDBConnectionProvider,
      useFactory: options.useFactory,
      inject: options.inject,
    };

    const databaseProvider: Provider<Knex> = {
      provide: ObjectionDatabaseProvider,
      useFactory: (connection: DBConnection) => {
        const instance = knex({
          client: "mysql",
          connection,
          // knex level snake case to camel case mapper
          // all objection models must use camel case
          ...knexSnakeCaseMappers(),
        });
        Entity.knex(instance);
        return instance;
      },
      inject: [ObjectionDBConnectionProvider],
    };

    return {
      module: ObjectionCoreModule,
      imports: options.imports,
      providers: [connectionProvider, databaseProvider],
      exports: [databaseProvider],
    };
  }
}
