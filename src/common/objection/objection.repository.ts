import { Entity } from "entities/base.entity";
import { ModelClass } from "objection";
import { Injectable } from "@nestjs/common";
import { QueryBuilder } from "common/objection/query-builder";
import { Hackathon } from "entities/hackathon.entity";
import { TableMetadataKey } from "common/objection/decorators/decorator.constants";

type StagedQuery<TResponse> = {
  raw(): QueryBuilder<any, any>;
  exec(): Promise<TResponse>;
  byHackathon(hackathonId?: string): QueryBuilder<any, any>;
};

type LazyQuery = (qb: QueryBuilder<any, any>) => QueryBuilder<any, any>;

@Injectable()
export class Repository<TEntity extends Entity = Entity> {
  constructor(
    private readonly model: ModelClass<TEntity>,
    private readonly disableByHackathon: boolean = false,
  ) {}

  private _resolveWithHackathon(
    query: LazyQuery,
    byHackathon?: string,
  ): QueryBuilder<any, any> {
    // defined in @Table decorator
    const metadata =
      Reflect.getOwnMetadata(TableMetadataKey, this.model.prototype) || {};

    if (metadata?.disableByHackathon || this.disableByHackathon) {
      return query(this.model.query());
    }

    const relatedQuery = Hackathon.relatedQuery(this.model.tableName);

    if (byHackathon) {
      return query(relatedQuery.for(byHackathon));
    } else {
      return query(relatedQuery.for(Hackathon.query().where("active", true)));
    }
  }

  private _stageQuery<TEntity>(query: LazyQuery): StagedQuery<TEntity> {
    return {
      raw: () => query(this.model.query()),
      exec: async () => await query(this.model.query()),
      byHackathon: (hackathonId?: string) =>
        this._resolveWithHackathon(query, hackathonId),
    };
  }

  findOne(id: string | number): StagedQuery<TEntity> {
    return this._stageQuery((qb) => qb.findById(id));
  }

  findAll(): StagedQuery<TEntity[]> {
    return this._stageQuery((qb) => qb);
  }

  replaceOne(id: string | number, data: any): StagedQuery<TEntity> {
    return this._stageQuery((qb) => qb.updateAndFetchById(id, data));
  }

  patchOne(id: string | number, data: any): StagedQuery<TEntity> {
    return this._stageQuery((qb) => qb.patchAndFetchById(id, data));
  }

  createOne(data: any): StagedQuery<TEntity> {
    return this._stageQuery((qb) => qb.insertAndFetch(data));
  }

  deleteOne(id: string | number): StagedQuery<TEntity> {
    return this._stageQuery((qb) => qb.deleteById(id));
  }
}
