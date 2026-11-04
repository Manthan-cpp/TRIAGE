import dotenv from 'dotenv';
import path from 'path';
import { createServer } from './server';
import { AppDatabase } from './storage/database';
import { getPort } from './lib/config';
import { JobQueue } from './jobs/jobQueue';

// Load environment configuration
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const PORT = getPort();
const app = createServer();

// Initialize DB schema on startup
AppDatabase.getInstance();
JobQueue.recoverInterruptedJobs();

const server = app.listen(PORT, () => {
  console.log(`[Triage Backend] Listening on port ${PORT}`);
  console.log(`[Triage Backend] Health check available at /health`);
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
