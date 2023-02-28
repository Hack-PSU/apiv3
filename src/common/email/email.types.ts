export type SendGridOptions = {
  apiKey: string;
};

export type EmailModuleOptions = {
  imports?: any[];
  useFactory: (...args: any[]) => SendGridOptions;
  inject?: any[];
};
