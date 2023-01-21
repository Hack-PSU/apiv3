import { Entity } from "entities/base.entity";
import { ModelClass } from "objection";
import { Injectable } from "@nestjs/common";
import { QueryBuilder } from "common/objection/query-builder";
import { Hackathon } from "entities/hackathon.entity";

type StagedQuery<TResponse> = {
  exec(): Promise<TResponse>;
  byHackathon(hackathonId?: string): Promise<TResponse>;
};

@Injectable()
export class Repository<TEntity extends Entity = Entity> {
  constructor(
    private readonly model: ModelClass<TEntity>,
    private readonly disableByHackathon: boolean = false,
  ) {}

  private async _resolveWithHackathon(
    query: QueryBuilder<any, any>,
    byHackathon?: string,
  ) {
    if (this.disableByHackathon) {
      return query;
    }

    if (byHackathon) {
      return query
        .joinRelated("hackathons")
        .where("hackathons.id", byHackathon);
    } else {
      return query.where(
        "hackathonId",
        Hackathon.query().select("id").where("active", true),
      );
    }
  }

  private _stageQuery<TResponse>(
    query: QueryBuilder<any, any>,
  ): StagedQuery<TResponse> {
    return {
      exec: async () => query,
      byHackathon: async (hackathonId?: string) =>
        this._resolveWithHackathon(query, hackathonId),
    };
  }

  findOne(id: string | number): StagedQuery<TEntity> {
    return this._stageQuery(this.model.query().findById(id));
  }

  findAll(): StagedQuery<TEntity[]> {
    return this._stageQuery(this.model.query());
  }

  replaceOne(id: string | number, data: any): StagedQuery<TEntity> {
    return this._stageQuery(this.model.query().updateAndFetchById(id, data));
  }

  patchOne(id: string | number, data: any): StagedQuery<TEntity> {
    return this._stageQuery(this.model.query().patchAndFetchById(id, data));
  }

  createOne(data: any): StagedQuery<TEntity> {
    return this._stageQuery(this.model.query().insertAndFetch(data));
  }

  deleteOne(id: string | number): StagedQuery<TEntity> {
    return this._stageQuery(this.model.query().deleteById(id));
  }
}
