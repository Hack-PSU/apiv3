/* eslint-disable @typescript-eslint/ban-ts-comment */
// ts-ignore required to inject static properties into constructor

import { Model, Modifiers, RelationMappings } from "objection";
import { QueryBuilder } from "../query-builder";
import { TableIDKey, TableSchemaKey } from "./decorator.constants";

type TableOptions<T extends Model> = {
  name: string;
  modifiers?: Modifiers<QueryBuilder<T>>;
  disableByHackathon?: boolean;
  hackathonId?: string;
  relationMappings?: RelationMappings;
};

export function Table<T extends Model>(
  options: TableOptions<T>,
): ClassDecorator {
  return function (constructor) {
    // @ts-ignore
    constructor.tableName = options.name;

    // @ts-ignore
    constructor.idColumn =
      Reflect.getOwnMetadata(TableIDKey, constructor.prototype) ?? "id";

    if (!options.disableByHackathon && options.hackathonId) {
      // @ts-ignore
      constructor.relationMappings = {
        hackathon: {
          relation: Model.BelongsToOneRelation,
          modelClass: "Hackathon",
          join: {
            from: `${options.name}.${options.hackathonId}`,
            to: "hackathons.id",
          },
        },
        ...options.relationMappings,
      } as RelationMappings;
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
