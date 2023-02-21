import { ObjectionBaseEntityProvider } from "common/objection/objection.constants";
import { Repository } from "common/objection/objection.repository";
import { Provider } from "@nestjs/common";
import { Hackathon } from "entities/hackathon.entity";
import { CustomEntity, EntityOrCustom } from "common/objection/objection.types";
import { Entity } from "entities/base.entity";

const isCustomEntity = <TEntity extends Entity>(
  entity: EntityOrCustom<TEntity>,
): entity is CustomEntity<TEntity> => "schema" in entity;

export function createObjectionProviders(entities: EntityOrCustom[]) {
  const modelProviders = entities.map((entity) => {
    if (isCustomEntity(entity)) {
      return {
        provide: `${ObjectionBaseEntityProvider}${entity.schema.name}`,
        useValue: new Repository(entity.schema, entity.disableByHackathon),
      };
    } else {
      return {
        provide: `${ObjectionBaseEntityProvider}${entity.name}`,
        useValue: new Repository(entity),
      };
    }
  });

  const hackathonProvider: Provider = {
    provide: `${ObjectionBaseEntityProvider}Hackathon`,
    useValue: new Repository(Hackathon, true),
  };

  // avoids providing 2 of the same models
  const filteredModels = modelProviders.filter(Boolean);

  return [...filteredModels, hackathonProvider];
}
