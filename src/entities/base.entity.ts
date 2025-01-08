import { Model } from "objection";
import { QueryBuilder } from "common/objection/query-builder";

export class Entity extends Model {
  declare QueryBuilderType: QueryBuilder<this>;
  static QueryBuilder = QueryBuilder;

  static get modelPaths() {
    return [__dirname];
  }
}
