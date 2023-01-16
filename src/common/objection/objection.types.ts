import { Knex } from "knex";
import { Entity } from "entities/base.entity";
import { ModelClass } from "objection";

export type DBConnection =
  | string
  | Knex.StaticConnectionConfig
  | Knex.ConnectionConfigProvider;

export type ObjectionCoreModuleOptions = {
  imports?: any[];
  useFactory: (...args: any[]) => DBConnection;
  inject?: any[];
};

export type CustomEntity<TEntity extends Entity> = {
  schema: ModelClass<TEntity>;
  disableByHackathon: boolean;
};

export type EntityOrCustom<TEntity extends Entity = Entity> =
  | ModelClass<TEntity>
  | CustomEntity<TEntity>;
