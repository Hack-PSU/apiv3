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
import { AdminPingBody } from "modules/socket/socket.interface";

@WebSocketGateway({
  namespace: "socket",
})
export class SocketGateway implements OnGatewayInit, OnGatewayConnection {
  @WebSocketServer() public socket: Server;

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
  private async handleMobilePing(@ConnectedSocket() socket: Socket) {
    socket.join(SocketRoom.MOBILE);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.TEAM)
  @SubscribeMessage("ping:admin")
  private handleAdminPing(
    @ConnectedSocket() socket: Socket,
    @MessageBody(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    )
    data: AdminPingBody,
  ) {
    if (data.role >= Role.EXEC) {
      socket.join([SocketRoom.ADMIN, SocketRoom.EXEC]);
    } else {
      socket.join(SocketRoom.ADMIN);
    }
  }
}
