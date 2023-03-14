import { UseGuards, ValidationPipe } from "@nestjs/common";
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { SocketRoom } from "common/socket";
import { Role, Roles, RolesGuard } from "common/gcp";
import { DefaultTopic, FirebaseMessagingService } from "common/gcp/messaging";
import { MobilePingBody } from "modules/socket/socket.interface";

@WebSocketGateway({
  namespace: "socket",
})
export class SocketGateway implements OnGatewayInit, OnGatewayConnection {
  @WebSocketServer() public socket: Server;

  constructor(private readonly fcmService: FirebaseMessagingService) {}

  afterInit(server: Server) {
    this.socket = server;
  }

  handleConnection(client: Socket) {
    console.log(`LOG [Connection]: ${client.id}`);
  }

  // Convenience method where if to === undefined, socket broadcasts
  // otherwise it broadcasts to the room
  public emit(event: string, data: any, to?: SocketRoom) {
    if (to) {
      this.socket.to(to).emit(event, data);
    } else {
      this.socket.emit(event, data);
    }
  }

  // Enforce authorization to verify request comes from known source
  @UseGuards(RolesGuard)
  @Roles(Role.NONE)
  @SubscribeMessage("ping:mobile")
  private async handleMobilePing(
    @ConnectedSocket() socket: Socket,
    @MessageBody(
      new ValidationPipe({
        forbidNonWhitelisted: true,
        whitelist: true,
        transform: true,
      }),
    )
    data: MobilePingBody,
  ) {
    socket.join(SocketRoom.MOBILE);

    await this.fcmService.register(data.userId, data.token, DefaultTopic.ALL);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.TEAM)
  @SubscribeMessage("ping:admin")
  private handleAdminPing(@ConnectedSocket() socket: Socket) {
    socket.join(SocketRoom.ADMIN);
  }
}
