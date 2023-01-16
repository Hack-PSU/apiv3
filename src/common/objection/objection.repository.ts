import { Entity } from "entities/base.entity";
import { ModelClass } from "objection";
import { Injectable } from "@nestjs/common";
import { QueryBuilder } from "common/objection/query-builder";
import { Hackathon } from "entities/hackathon.entity";

@Injectable()
export class Repository<TEntity extends Entity = Entity> {
  constructor(
    private readonly model: ModelClass<TEntity>,
    private readonly disableByHackathon: boolean = false,
  ) {}

  private async _resolveWithHackathon(
    query: QueryBuilder<any, any>,
    byHackathon?: string | boolean,
  ) {
    if (this.disableByHackathon || byHackathon === false) {
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

  async findOne(
    id: string | number,
    byHackathon?: string | boolean,
  ): Promise<TEntity> {
    return this._resolveWithHackathon(
      this.model.query().findById(id),
      byHackathon ?? false,
    );
  }

  async findAll(byHackathon?: string | boolean): Promise<TEntity[]> {
    return this._resolveWithHackathon(this.model.query(), byHackathon);
  }

  async replaceOne(
    id: string | number,
    data: any,
    byHackathon?: string | boolean,
  ): Promise<TEntity> {
    return this._resolveWithHackathon(
      this.model.query().updateAndFetchById(id, data),
      byHackathon ?? false,
    );
  }

  async patchOne(
    id: string | number,
    data: any,
    byHackathon?: string | boolean,
  ): Promise<TEntity> {
    return this._resolveWithHackathon(
      this.model.query().patchAndFetchById(id, data),
      byHackathon ?? false,
    );
  }

  async createOne(data: any): Promise<TEntity> {
    return (await this.model.query().insertAndFetch(data)) as TEntity;
  }

  async deleteOne(
    id: string | number,
    byHackathon?: string | boolean,
  ): Promise<TEntity> {
    return this._resolveWithHackathon(
      this.model.query().deleteById(id),
      byHackathon ?? false,
    );
  }
}
