import { TableIDKey } from "./decorator.constants";
import { Column } from "common/objection";
import { JSONSchemaTypes } from "./decorator.types";

type IDOptions = {
  type?: JSONSchemaTypes;
};

export function ID(options?: IDOptions): PropertyDecorator {
  return (target, propertyKey) => {
    const idProperty = Reflect.getOwnMetadata(TableIDKey, target);

    if (idProperty) {
      Reflect.defineMetadata(TableIDKey, [...idProperty, propertyKey], target);
    } else {
      Reflect.defineMetadata(TableIDKey, [propertyKey], target);
    }

    // required = false to avoid schema validation from requiring during update
    // and insert
    return Column({
      type: options?.type ?? "number",
      required: false,
      nullable: false,
    })(target, propertyKey);
  };
}
