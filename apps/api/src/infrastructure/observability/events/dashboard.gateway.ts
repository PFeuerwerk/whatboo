import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*', // En producción se restringe al dominio del SaaS de Angular 19
  },
  namespace: 'dashboard',
})
export class DashboardGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(DashboardGateway.name);

  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    // Extracción del Tenant ID desde los headers del handshake de Socket.io
    const restaurantId = client.handshake.query.restaurantId as string;
    
    if (!restaurantId) {
      this.logger.warn(`[WebSocket] Conexión rechazada: Falta restaurantId. Cliente ID: ${client.id}`);
      client.disconnect();
      return;
    }

    // El cliente se une de forma atómica a la sala exclusiva de su restaurante
    client.join(restaurantId);
    this.logger.log(`[WebSocket] Dashboard conectado y suscrito al restaurante: ${restaurantId}. Cliente ID: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`[WebSocket] Dashboard desconectado. Cliente ID: ${client.id}`);
  }

  /**
   * Emite de forma segura un evento en tiempo real únicamente al restaurante implicado.
   */
  public emitToRestaurant(restaurantId: string, event: string, payload: any) {
    this.server.to(restaurantId).emit(event, payload);
    this.logger.debug(`[WebSocket] Evento '${event}' emitido al restaurante: ${restaurantId}`);
  }
}
