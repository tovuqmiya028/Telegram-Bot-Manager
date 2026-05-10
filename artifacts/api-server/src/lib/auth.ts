import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import { logger } from "./logger.js";

const JWT_SECRET = process.env["JWT_SECRET"] ?? "telegram-admin-secret-change-in-prod";
const ADMIN_USERNAME = process.env["ADMIN_PANEL_USERNAME"] ?? "admin";
const ADMIN_PASSWORD = process.env["ADMIN_PANEL_PASSWORD"] ?? "admin123";

export function validateAdminCredentials(username: string, password: string): boolean {
  return username === ADMIN_USERNAME && password === ADMIN_PASSWORD;
}

export function generateToken(username: string): string {
  return jwt.sign({ username, role: "admin" }, JWT_SECRET, { expiresIn: "24h" });
}

export function verifyToken(token: string): { username: string; role: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { username: string; role: string };
  } catch {
    return null;
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const tokenFromHeader = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const tokenFromCookie = req.cookies?.["admin_token"] as string | undefined;
  const token = tokenFromHeader ?? tokenFromCookie;

  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  (req as Request & { admin?: { username: string } }).admin = { username: payload.username };
  next();
}
