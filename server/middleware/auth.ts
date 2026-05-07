import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

import { config } from '../config';

const JWT_SECRET = config.jwtSecret;

export function authenticate(req: Request, res: Response, next: NextFunction) {
  // 1. Check for API Key in headers (for external systems)
  const authHeader = req.headers.authorization;
  const apiKeyHeader = req.headers['x-api-key'];
  const providedKey = apiKeyHeader || (authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null);

  if (providedKey && providedKey === config.apiToken) {
    (req as any).user = { id: 'api-user', username: 'api-system' };
    return next();
  }

  // 2. Check for cookie-based JWT token (for browser UI)
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    (req as any).user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
}
