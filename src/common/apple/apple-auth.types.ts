export type AppleAuthConfig = {
  iss: string;
  aud: string;
  sub: string;
  pk: string;
  kid: string;
};

export type AppleAuthModuleOptions = {
  imports?: any[];
  useFactory: (...args: any[]) => AppleAuthConfig;
  inject?: any[];
};
