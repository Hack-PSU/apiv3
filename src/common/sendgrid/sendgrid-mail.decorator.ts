import { Inject } from "@nestjs/common";
import { SendGridModuleConnectionProvider } from "common/sendgrid/sendgrid.constants";

export const InjectSendGrid = () => Inject(SendGridModuleConnectionProvider);
