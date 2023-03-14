import { Global, Module } from "@nestjs/common";
import { SocketGateway } from "./socket.gateway";
import { FirebaseMessagingModule } from "common/gcp/messaging";

@Global()
@Module({
  imports: [FirebaseMessagingModule],
  providers: [SocketGateway],
  exports: [SocketGateway],
})
export class SocketModule {}
