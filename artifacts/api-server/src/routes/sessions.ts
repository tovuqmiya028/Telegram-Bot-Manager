import { Router, type IRouter } from "express";
import { requireAdmin } from "../lib/auth.js";
import { prisma } from "../lib/prisma.js";

const router: IRouter = Router();

router.get("/sessions", requireAdmin, async (_req, res): Promise<void> => {
  const sessions = await prisma.session.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: true },
  });

  res.json(sessions.map((s) => ({
    id: s.id, userId: s.userId, phone: s.phone, isActive: s.isActive,
    createdAt: s.createdAt.toISOString(),
    userFullName: s.user.fullName, userUsername: s.user.username,
  })));
});

router.get("/sessions/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw ?? "", 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const s = await prisma.session.findUnique({ where: { id }, include: { user: true } });
  if (!s) { res.status(404).json({ error: "Session not found" }); return; }

  res.json({ id: s.id, userId: s.userId, phone: s.phone, isActive: s.isActive, createdAt: s.createdAt.toISOString(), userFullName: s.user.fullName, userUsername: s.user.username });
});

router.patch("/sessions/:id/disconnect", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw ?? "", 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const s = await prisma.session.update({ where: { id }, data: { isActive: false, sessionString: "" }, include: { user: true } });
  res.json({ id: s.id, userId: s.userId, phone: s.phone, isActive: s.isActive, createdAt: s.createdAt.toISOString(), userFullName: s.user.fullName, userUsername: s.user.username });
});

router.get("/sessions/:id/contacts", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw ?? "", 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const contacts = await prisma.contact.findMany({ where: { sessionId: id } });
  res.json(contacts.map((c) => ({ id: c.id, sessionId: c.sessionId, telegramId: c.telegramId, name: c.name, username: c.username })));
});

export default router;
