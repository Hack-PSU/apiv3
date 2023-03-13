export type SendGridOptions = {
  apiKey: string;
};

export type EmailModuleOptions = {
  imports?: any[];
  useFactory: (...args: any[]) => SendGridOptions;
  inject?: any[];
};

export type SendEmailOptions = {
  from?: string;
  fromName?: string;
  to: string;
  subject: string;
  message: string;
  reply?: string;
};
