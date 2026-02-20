import { Request, Response, NextFunction } from "express";

const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 60;

const ipStore = new Map<string, { count: number; resetAt: number }>();

export function rateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || "unknown";
  const now = Date.now();
  const entry = ipStore.get(ip);

  if (!entry || now > entry.resetAt) {
    ipStore.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return next();
  }

  if (entry.count >= MAX_REQUESTS) {
    return res.status(429).json({ error: "Too many requests" });
  }

  entry.count += 1;
  ipStore.set(ip, entry);
  next();
}

