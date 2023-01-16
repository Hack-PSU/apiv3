import { TableSchemaKey } from "./decorator.constants";
import { JSONSchemaTypes } from "./decorator.types";

type ColumnOptions = {
  type: JSONSchemaTypes;
  required?: boolean;
  schema?: object;
  nullable?: boolean;
};

export function Column(options: ColumnOptions): PropertyDecorator {
  const { type, required = true, nullable = false } = options;

  return function (target, propertyKey) {
    let schema = Reflect.getOwnMetadata(TableSchemaKey, target) || {};

    if (Object.keys(schema).length === 0) {
      schema = {
        type: "object",
        required: [],
        properties: {},
      };
    }

    if (required) {
      schema.required.push(propertyKey);
    }

    const types = [type === "json" ? "object" : type];

    if (options.type === "json" && !options.schema) {
      throw Error("Property of type 'json' must have a schema");
    }

    schema.properties = {
      ...schema.properties,
      [propertyKey]: {
        type: nullable ? [...types, "null"] : types[0],
        ...(options.type === "json" ? { properties: options.schema } : {}),
      },
    };

    Reflect.defineMetadata(TableSchemaKey, schema, target);
  };
}
