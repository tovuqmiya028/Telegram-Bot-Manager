import { Router, type IRouter } from "express";
import { validateAdminCredentials, generateToken, verifyToken, requireAdmin } from "../lib/auth.js";
import { AdminLoginBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = AdminLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { username, password } = parsed.data;
  if (!validateAdminCredentials(username, password)) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  const token = generateToken(username);
  res.cookie("admin_token", token, {
    httpOnly: true,
    secure: process.env["NODE_ENV"] === "production",
    maxAge: 24 * 60 * 60 * 1000,
  });
  res.json({ success: true, token });
});

router.post("/auth/logout", (_req, res): void => {
  res.clearCookie("admin_token");
  res.json({ success: true });
});

router.get("/auth/me", (req, res): void => {
  const authHeader = req.headers.authorization;
  const tokenFromHeader = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const tokenFromCookie = req.cookies?.["admin_token"] as string | undefined;
  const token = tokenFromHeader ?? tokenFromCookie;
  if (!token) {
    res.json({ authenticated: false, username: null });
    return;
  }
  const payload = verifyToken(token);
  if (!payload) {
    res.json({ authenticated: false, username: null });
    return;
  }
  res.json({ authenticated: true, username: payload.username });
});

export default router;
