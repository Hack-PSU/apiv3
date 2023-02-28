import { DynamicModule, Global, Module, Provider } from "@nestjs/common";
import { EmailService } from "common/email/email.service";
import { EmailModuleOptions, SendGridOptions } from "common/email/email.types";
import {
  EmailModuleConnectionProvider,
  EmailModuleOptionsProvider,
} from "common/email/email.constants";
import * as sgMail from "@sendgrid/mail";
import MailService from "@sendgrid/mail";

@Global()
@Module({
  imports: [],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {
  static forRoot(options: EmailModuleOptions): DynamicModule {
    const optionsProvider: Provider<SendGridOptions> = {
      provide: EmailModuleOptionsProvider,
      useFactory: options.useFactory,
      inject: options.inject,
    };

    const connectionProvider: Provider<typeof MailService> = {
      provide: EmailModuleConnectionProvider,
      useFactory: (options: SendGridOptions) => {
        sgMail.setApiKey(options.apiKey);
        return sgMail;
      },
      inject: [EmailModuleOptionsProvider],
    };

    return {
      module: EmailModule,
      imports: options.imports,
      providers: [optionsProvider, connectionProvider],
      exports: [connectionProvider],
    };
  }
}
