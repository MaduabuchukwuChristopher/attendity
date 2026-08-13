import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import jsonwebtoken from 'jsonwebtoken';
import { environment } from '../config/environment.js';
import { socketService } from './socket.service.js';

const { verify } = jsonwebtoken;

export function createSocketServer(server: HttpServer): Server {
  const io = new Server(server, {
    cors: { origin: environment.CORS_ORIGIN.split(','), credentials: true },
  });
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token as unknown;
      if (typeof token !== 'string') throw new Error();
      const claims = verify(token, environment.JWT_ACCESS_SECRET) as {
        sub: string;
        universityId: string;
        type: string;
      };
      if (claims.type !== 'access') throw new Error();
      void socket.join(`user:${claims.sub}`);
      void socket.join(`university:${claims.universityId}`);
      next();
    } catch {
      next(new Error('Unauthorized socket connection.'));
    }
  });
  socketService.initialize(io);
  return io;
}
