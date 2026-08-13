import { app } from './app.js';
import { environment } from './config/environment.js';
import { connectDatabase, disconnectDatabase } from './database/mongodb.js';
import { createSocketServer } from './socket/index.js';
import { logger } from './config/logger.js';
import { notificationWorker } from './workers/notification.worker.js';

async function bootstrap(): Promise<void> {
  await connectDatabase();
  const server = app.listen(environment.API_PORT);
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 66_000;
  server.requestTimeout = 30_000;
  const socketServer = createSocketServer(server);
  notificationWorker.start();
  let shuttingDown = false;
  const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'Graceful shutdown started');
    notificationWorker.stop();
    const forceExit = setTimeout(() => {
      logger.fatal('Graceful shutdown timed out');
      process.exit(1);
    }, 15_000);
    forceExit.unref();
    await new Promise<void>((resolve, reject) => {
      void socketServer.close(() => {
        if (!server.listening) {
          resolve();
          return;
        }
        server.close((error) => (error ? reject(error) : resolve()));
      });
    });
    await disconnectDatabase();
    clearTimeout(forceExit);
    logger.info('Graceful shutdown completed');
  };
  const handleShutdown = (signal: NodeJS.Signals): void => {
    void shutdown(signal).then(
      () => process.exit(0),
      (error: unknown) => {
        logger.fatal({ error }, 'Graceful shutdown failed');
        process.exit(1);
      },
    );
  };
  process.once('SIGINT', handleShutdown);
  process.once('SIGTERM', handleShutdown);
}
void bootstrap().catch((error: unknown) => {
  logger.fatal({ error }, 'API startup failed');
  process.exitCode = 1;
});
