import { Server } from 'http';
import { createTestApp } from './e2e/test-app';
import { logger } from '../utils/logger';

let server: Server | null = null;
let portCounter = Math.floor(Math.random() * 1000) + 4000; // Start from random port in 4000-5000 range

export function getNextPort(): number {
  return portCounter++;
}

export async function startTestServer(port?: number): Promise<{ app: any; server: Server; port: number }> {
  const testPort = port || getNextPort();
  const app = createTestApp();

  return new Promise((resolve, reject) => {
    try {
      const newServer = app.listen(testPort, () => {
        logger.info(`Test server started on port ${testPort}`);
        server = newServer;
        resolve({ app, server: newServer, port: testPort });
      });

      newServer.on('error', (error) => {
        logger.error('Test server error:', error);
        reject(error);
      });
    } catch (error) {
      logger.error('Error starting test server:', error);
      reject(error);
    }
  });
}

export async function stopTestServer(): Promise<void> {
  return new Promise((resolve) => {
    if (server) {
      server.close((error) => {
        if (error) {
          logger.error('Error stopping test server:', error);
        } else {
          logger.info('Test server stopped');
        }
        server = null;
        resolve();
      });

      // Force close after 5 seconds
      setTimeout(() => {
        if (server) {
          server.closeAllConnections();
          server.close(() => {
            server = null;
            resolve();
          });
        }
      }, 5000);
    } else {
      resolve();
    }
  });
}
