/* eslint-disable @typescript-eslint/ban-ts-comment */
// ts-ignore required to inject static properties into constructor

import { Model, Modifiers, RelationMappings } from "objection";
import { QueryBuilder } from "../query-builder";
import {
  TableIDKey,
  TableMetadataKey,
  TableSchemaKey,
} from "./decorator.constants";

type TableOptions<T extends Model> = {
  name: string;
  modifiers?: Modifiers<QueryBuilder<T>>;
  disableByHackathon?: boolean;
  hackathonId?: string;
  relationMappings?: RelationMappings;
};

const resolveRelations = (relations?: RelationMappings): RelationMappings => {
  if (!relations) {
    return {};
  }

  return Object.entries(relations).reduce((acc, curr) => {
    acc[curr[0]] = {
      ...curr[1],
      modelClass: `${(curr[1].modelClass as string).toLowerCase()}.entity.js`,
    };
    return acc;
  }, {} as RelationMappings);
};

export function Table<T extends Model>(
  options: TableOptions<T>,
): ClassDecorator {
  return function (constructor) {
    Reflect.defineMetadata(TableMetadataKey, options, constructor.prototype);

    // @ts-ignore
    constructor.tableName = options.name;

    const ids = Reflect.getOwnMetadata(TableIDKey, constructor.prototype);

    if (!ids) {
      throw new Error(
        `${options.name} requires a primary key or a composite key`,
      );
    }

    if (ids.length > 1) {
      // @ts-ignore
      constructor.idColumn = ids;
    } else {
      // @ts-ignore
      constructor.idColumn = ids[0];
    }

    // @ts-ignore
    constructor.relationMappings = options.relationMappings;

    // @ts-ignore
    constructor.modifiers = options.modifiers;

    // @ts-ignore
    constructor.jsonSchema = Reflect.getOwnMetadata(
      TableSchemaKey,
      constructor.prototype,
    );
  };
}
