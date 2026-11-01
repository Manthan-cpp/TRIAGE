import dotenv from 'dotenv';
import path from 'path';
import { createServer } from './server';
import { AppDatabase } from './storage/database';

// Load environment configuration
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
const app = createServer();

// Initialize DB schema on startup
AppDatabase.getInstance();

const server = app.listen(PORT, () => {
  console.log(`[Triage Backend] Listening on port ${PORT}`);
  console.log(`[Triage Backend] Health check available at http://localhost:${PORT}/health`);
});

// Graceful shutdown
const shutdown = (signal: string) => {
  console.log(`\n[Triage Backend] Received ${signal}. Shutting down gracefully...`);
  server.close(() => {
    AppDatabase.close();
    console.log('[Triage Backend] Database closed and server terminated.');
    process.exit(0);
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
