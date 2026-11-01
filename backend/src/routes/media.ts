import { Router, Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';

const router = Router();
const PROJECT_ROOT = path.resolve(__dirname, '../../../');

/**
 * GET /api/media/*
 * Stream normalized image or video assets safely with path traversal protection.
 */
router.get(/^\/media\/(.+)$/, (req: Request, res: Response): void => {
  const relativeSubpath = req.params[0];
  if (!relativeSubpath) {
    res.status(400).json({ error: 'Missing media file path' });
    return;
  }

  // Resolve absolute path and prevent directory traversal
  const resolvedPath = path.resolve(PROJECT_ROOT, relativeSubpath);
  if (!resolvedPath.startsWith(PROJECT_ROOT)) {
    res.status(403).json({ error: 'Access denied: Invalid path traversal attempt' });
    return;
  }

  if (!fs.existsSync(resolvedPath) || !fs.statSync(resolvedPath).isFile()) {
    res.status(404).json({ error: `Media asset not found: ${relativeSubpath}` });
    return;
  }

  const ext = path.extname(resolvedPath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
  };

  const contentType = mimeTypes[ext] || 'application/octet-stream';
  res.setHeader('Content-Type', contentType);
  res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24h

  const stream = fs.createReadStream(resolvedPath);
  stream.pipe(res);
});

export default router;
