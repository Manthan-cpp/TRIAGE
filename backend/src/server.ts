import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import jobsRouter from './routes/jobs';
import candidatesRouter from './routes/candidates';
import mediaRouter from './routes/media';
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

  return app;
}
