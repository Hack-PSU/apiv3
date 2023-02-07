/* eslint-disable @typescript-eslint/ban-ts-comment */
// ts-ignore required to inject static properties into constructor

import { Model, Modifiers, Relation, RelationMappings } from "objection";
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

    // @ts-ignore
    constructor.idColumn =
      Reflect.getOwnMetadata(TableIDKey, constructor.prototype) ?? "id";

    if (!options.disableByHackathon && options.hackathonId) {
      // @ts-ignore
      // constructor.relationMappings = {
      //   hackathon: {
      //     relation: Model.BelongsToOneRelation,
      //     modelClass: "hackathon.entity.ts",
      //     join: {
      //       from: `${options.name}.${options.hackathonId}`,
      //       to: "hackathons.id",
      //     },
      //   },
      //   ...options.relationMappings,
      // } as RelationMappings;
    } else {
      // @ts-ignore
      constructor.relationMappings = options.relationMappings;
    }

    // @ts-ignore
    constructor.modifiers = options.modifiers;

    // @ts-ignore
    constructor.jsonSchema = Reflect.getOwnMetadata(
      TableSchemaKey,
      constructor.prototype,
    );
  };
}
