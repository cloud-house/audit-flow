import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { AuditStatus } from '@auditflow/types';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/audits',
})
export class AuditGateway implements OnGatewayConnection {
  @WebSocketServer()
  private readonly server!: Server;

  private readonly logger = new Logger(AuditGateway.name);

  handleConnection(client: Socket): void {
    this.logger.debug(`Client connected: ${client.id}`);
  }

  emitProgress(auditId: string, percent: number, currentUrl: string): void {
    this.server.emit(`audit.${auditId}.progress`, { percent, currentUrl });
  }

  emitStatusChange(auditId: string, status: AuditStatus): void {
    this.server.emit(`audit.${auditId}.status`, { status });
  }
}
