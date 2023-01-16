import { Model, Page, QueryBuilder as ObjectionQueryBuilder } from "objection";

export class QueryBuilder<
  M extends Model,
  R = M[],
> extends ObjectionQueryBuilder<M, R> {
  ArrayQueryBuilderType: QueryBuilder<M, M[]>;
  SingleQueryBuilderType: QueryBuilder<M, M>;
  MaybeSingleQueryBuilderType: QueryBuilder<M, M | undefined>;
  NumberQueryBuilderType: QueryBuilder<M, number>;
  PageQueryBuilderType: QueryBuilder<M, Page<M>>;
}
