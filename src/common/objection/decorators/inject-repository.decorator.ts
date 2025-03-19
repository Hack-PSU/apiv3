import { Entity } from "@entities/base.entity";
import { Inject } from "@nestjs/common";
import { ObjectionBaseEntityProvider } from "../objection.constants";
import { ModelClass } from "objection";

export const InjectRepository = (entity: ModelClass<Entity>) =>
  Inject(`${ObjectionBaseEntityProvider}${entity.name}`);
