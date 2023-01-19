import { Injectable, UseGuards } from "@nestjs/common";
import {
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { SocketRoom } from "common/socket";
import { Role, Roles, RolesGuard } from "common/firebase";

@Injectable()
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
  private handleMobilePing(@ConnectedSocket() socket: Socket) {
    socket.join(SocketRoom.MOBILE);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.TEAM)
  @SubscribeMessage("ping:admin")
  private handleAdminPing(@ConnectedSocket() socket: Socket) {
    socket.join(SocketRoom.ADMIN);
  }
}
