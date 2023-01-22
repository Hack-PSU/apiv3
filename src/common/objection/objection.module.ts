import { DynamicModule, Module, Provider } from "@nestjs/common";
import {
  CustomEntity,
  EntityOrCustom,
  ObjectionCoreModuleOptions,
} from "./objection.types";
import { ObjectionCoreModule } from "./objection-core.module";
import { Entity } from "entities/base.entity";
import { ObjectionBaseEntityProvider } from "./objection.constants";
import { Repository } from "./objection.repository";
import { Hackathon } from "entities/hackathon.entity";

const isCustomEntity = <TEntity extends Entity>(
  entity: EntityOrCustom<TEntity>,
): entity is CustomEntity<TEntity> => "schema" in entity;

@Module({})
export class ObjectionModule {
  static forRoot(options: ObjectionCoreModuleOptions): DynamicModule {
    return {
      module: ObjectionModule,
      imports: [ObjectionCoreModule.forRoot(options)],
    };
  }

  static forFeature(entities: EntityOrCustom[]): DynamicModule {
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

    return {
      module: ObjectionModule,
      providers: [...filteredModels, hackathonProvider],
      exports: [...filteredModels, hackathonProvider],
    };
  }
}
