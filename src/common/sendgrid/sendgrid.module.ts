import { DynamicModule, Global, Module, Provider } from "@nestjs/common";
import {
  EmailModuleOptions,
  SendGridOptions,
} from "common/sendgrid/sendgrid.types";
import {
  SendGridModuleConnectionProvider,
  SendGridModuleOptionsProvider,
} from "common/sendgrid/sendgrid.constants";
import * as sgMail from "@sendgrid/mail";
import { MailService } from "@sendgrid/mail";
import { SendGridService } from "common/sendgrid/sendgrid.service";

@Global()
@Module({
  imports: [],
  providers: [SendGridService],
  exports: [SendGridService],
})
export class SendGridModule {
  static forRoot(options: EmailModuleOptions): DynamicModule {
    const optionsProvider: Provider<SendGridOptions> = {
      provide: SendGridModuleOptionsProvider,
      useFactory: options.useFactory,
      inject: options.inject,
    };

    const connectionProvider: Provider<MailService> = {
      provide: SendGridModuleConnectionProvider,
      useFactory: (options: SendGridOptions) => {
        sgMail.setApiKey(options.apiKey);
        return sgMail;
      },
      inject: [SendGridModuleOptionsProvider],
    };

    return {
      module: SendGridModule,
      imports: options.imports,
      providers: [optionsProvider, connectionProvider],
      exports: [connectionProvider],
    };
  }
}
