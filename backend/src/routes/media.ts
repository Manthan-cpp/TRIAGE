import { Router, Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { getDataDir, getIngestedDir, isPathInside, PROJECT_ROOT } from '../lib/config';

const router = Router();
const MEDIA_ROOTS = [path.join(getDataDir(), 'raw'), getIngestedDir()];

/**
 * GET /api/media/*
 * Stream normalized image or video assets safely with path traversal protection.
 */
router.get(/^\/media\/(.+)$/, (req: Request, res: Response): void => {
  const rawSubpath = req.params[0];
  if (!rawSubpath) {
    res.status(400).json({ error: 'Missing media file path' });
    return;
  }

  // Resolve absolute path and prevent directory traversal
  let relativeSubpath = rawSubpath;
  try {
    relativeSubpath = decodeURIComponent(rawSubpath);
  } catch {
    res.status(400).json({ error: 'Malformed URI encoding' });
    return;
  }

  const resolvedPath = path.resolve(PROJECT_ROOT, relativeSubpath);
  if (!MEDIA_ROOTS.some((root) => isPathInside(root, resolvedPath))) {
    res.status(403).json({ error: 'Access denied: Invalid path traversal attempt' });
    return;
  }

  if (!fs.existsSync(resolvedPath) || !fs.statSync(resolvedPath).isFile()) {
    res.status(404).json({ error: `Media asset not found: ${relativeSubpath}` });
    return;
  }

  let realPath: string;
  try {
    realPath = fs.realpathSync(resolvedPath);
  } catch {
    res.status(404).json({ error: 'Media asset is no longer available' });
    return;
  }
  const realRoots = MEDIA_ROOTS.filter((root) => fs.existsSync(root)).map((root) => fs.realpathSync(root));
  if (!realRoots.some((root) => isPathInside(root, realPath))) {
    res.status(403).json({ error: 'Access denied: Media link escapes the configured media roots' });
    return;
  }

  const ext = path.extname(realPath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
  };

  if (!mimeTypes[ext]) {
    res.status(403).json({ error: 'Access denied: Unsupported media asset type' });
    return;
  }

  const contentType = mimeTypes[ext];
  res.setHeader('Content-Type', contentType);
  res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24h

  const stream = fs.createReadStream(realPath);
  stream.on('error', () => {
    if (!res.headersSent) res.status(404).json({ error: 'Media asset could not be read' });
    else res.destroy();
  });
  stream.pipe(res);
});

export default router;
