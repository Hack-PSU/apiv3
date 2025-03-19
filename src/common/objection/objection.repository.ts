import { Entity } from "@entities/base.entity";
import { MaybeCompositeId, ModelClass } from "objection";
import { Injectable } from "@nestjs/common";
import { QueryBuilder } from "common/objection/query-builder";
import { Hackathon } from "@entities/hackathon.entity";
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

  protected get hackathonRelation() {
    return Hackathon.relatedQuery(this.model.tableName);
  }

  protected get activeHackathon() {
    return Hackathon.query().where("active", true);
  }

  private _resolveWithHackathon(
    query: LazyQuery,
    byHackathon?: string,
  ): QueryBuilder<any, any> {
    // defined in @Table decorator
    const metadata =
      Reflect.getOwnMetadata(TableMetadataKey, this.model.prototype) || {};

    if (metadata?.disableByHackathon || this.disableByHackathon) {
      return this._stageQuery(query).raw();
    }

    // get methods can be overriden without rewriting logic
    const relatedQuery = this.hackathonRelation;

    if (byHackathon) {
      return query(relatedQuery.for(byHackathon));
    } else {
      return query(relatedQuery.for(this.activeHackathon));
    }
  }

  protected _stageQuery<TEntity>(query: LazyQuery): StagedQuery<TEntity> {
    return {
      raw: () => query(this.model.query()),
      exec: async () => await query(this.model.query()),
      byHackathon: (hackathonId?: string) =>
        this._resolveWithHackathon(query, hackathonId),
    };
  }

  findOne(id: MaybeCompositeId): StagedQuery<TEntity> {
    return this._stageQuery((qb) => qb.findById(id));
  }

  findAll(): StagedQuery<TEntity[]> {
    return this._stageQuery((qb) => qb);
  }

  replaceOne(id: string | number, data: any): StagedQuery<TEntity> {
    return this._stageQuery((qb) => qb.updateAndFetchById(id, data));
  }

  patchOne(id: MaybeCompositeId, data: any): StagedQuery<TEntity> {
    return this._stageQuery((qb) => qb.patchAndFetchById(id, data));
  }

  createOne(data: any): StagedQuery<TEntity> {
    return this._stageQuery((qb) => qb.insertAndFetch(data));
  }

  deleteOne(id: MaybeCompositeId): StagedQuery<TEntity> {
    return this._stageQuery((qb) => qb.deleteById(id));
  }
}
