import { DynamicModule, Global, Module, Provider } from "@nestjs/common";
import {
  AppleAuthConfig,
  AppleAuthModuleOptions,
} from "common/apple/apple-auth.types";
import { AppleAuthConfigProvider } from "common/apple/apple-auth.constants";
import { AppleAuthService } from "common/apple/apple-auth.service";
import { HttpModule } from "@nestjs/axios";

@Global()
@Module({
  imports: [HttpModule],
  providers: [AppleAuthService],
  exports: [AppleAuthService],
})
export class AppleAuthModule {
  public static forRoot(options: AppleAuthModuleOptions): DynamicModule {
    const configProvider: Provider<AppleAuthConfig> = {
      provide: AppleAuthConfigProvider,
      useFactory: options.useFactory,
      inject: options.inject,
    };

    return {
      module: AppleAuthModule,
      imports: options.imports,
      providers: [configProvider],
      exports: [configProvider],
    };
  }
}
