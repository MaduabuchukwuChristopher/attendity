import type { Server } from 'socket.io';
export class SocketService {
  private io?: Server;
  initialize(io: Server): void {
    this.io = io;
  }
  emitToUser(userId: string, event: string, payload: unknown): void {
    this.io?.to(`user:${userId}`).emit(event, payload);
  }
  emitToUniversity(universityId: string, event: string, payload: unknown): void {
    this.io?.to(`university:${universityId}`).emit(event, payload);
  }
}
export const socketService = new SocketService();
