import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import jobsRouter from './routes/jobs';
import candidatesRouter from './routes/candidates';
import mediaRouter from './routes/media';
import auditRouter from './routes/audit';
import systemRouter from './routes/system';
import { CostLogger } from './lib/costLogger';

export function createServer(): Express {
  const app = express();

  // Middleware
  const configuredOrigin = process.env.CORS_ORIGIN?.trim();
  app.use(cors(configuredOrigin ? { origin: configuredOrigin } : undefined));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Health-check endpoint per Section 6 production checklist
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'triage-backend',
      timestamp: new Date().toISOString(),
      costSummary: CostLogger.getSummary(),
      runtime: {
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        uptimeSec: Math.round(process.uptime()),
      },
    });
  });

  // Mount API routes
  app.use('/api', jobsRouter);
  app.use('/api', candidatesRouter);
  app.use('/api', mediaRouter);
  app.use('/api', auditRouter);
  app.use('/api', systemRouter);

  // Serve compiled frontend in production if dist/ exists
  const frontendDist = path.resolve(__dirname, '../../frontend/dist');
  if (fs.existsSync(frontendDist)) {
    app.use(express.static(frontendDist));
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.method !== 'GET' || req.path.startsWith('/api') || req.path === '/health') {
        return next();
      }
      res.sendFile(path.join(frontendDist, 'index.html'));
    });
  }

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof multer.MulterError) {
      const status = err.code.startsWith('LIMIT_') ? 413 : 400;
      res.status(status).json({ error: `Upload rejected: ${err.message}` });
      return;
    }
    const status = typeof err === 'object' && err !== null && 'status' in err && typeof err.status === 'number'
      ? err.status
      : 500;
    const message = status < 500 && err instanceof Error ? err.message : 'Request could not be completed.';
    res.status(status).json({ error: message });
  });

  return app;
}
