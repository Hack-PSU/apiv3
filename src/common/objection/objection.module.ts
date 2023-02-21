import { DynamicModule, Module } from "@nestjs/common";
import { EntityOrCustom, ObjectionCoreModuleOptions } from "./objection.types";
import { ObjectionCoreModule } from "./objection-core.module";
import { createObjectionProviders } from "common/objection/objection.utils";

@Module({})
export class ObjectionModule {
  static forRoot(options: ObjectionCoreModuleOptions): DynamicModule {
    return {
      module: ObjectionModule,
      imports: [ObjectionCoreModule.forRoot(options)],
    };
  }

  static forFeature(entities: EntityOrCustom[]): DynamicModule {
    const providers = createObjectionProviders(entities);
    return {
      module: ObjectionModule,
      providers: providers,
      exports: providers,
    };
  }
}
