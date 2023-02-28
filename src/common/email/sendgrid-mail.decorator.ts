import { Inject } from "@nestjs/common";
import { EmailModuleConnectionProvider } from "common/email/email.constants";

export const InjectSendGrid = () => Inject(EmailModuleConnectionProvider);
