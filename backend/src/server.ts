import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import * as path from 'path';
import * as fs from 'fs';
import jobsRouter from './routes/jobs';
import candidatesRouter from './routes/candidates';
import mediaRouter from './routes/media';
import auditRouter from './routes/audit';
import { CostLogger } from './lib/costLogger';

export function createServer(): Express {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health-check endpoint per Section 6 production checklist
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'triage-backend',
      timestamp: new Date().toISOString(),
      costSummary: CostLogger.getSummary(),
    });
  });

  // Mount API routes
  app.use('/api', jobsRouter);
  app.use('/api', candidatesRouter);
  app.use('/api', mediaRouter);
  app.use('/api', auditRouter);

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

  return app;
}
