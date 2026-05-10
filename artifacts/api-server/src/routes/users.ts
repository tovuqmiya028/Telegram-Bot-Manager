import { Router, type IRouter } from "express";
import { requireAdmin } from "../lib/auth.js";
import { prisma } from "../lib/prisma.js";

const router: IRouter = Router();

router.get("/users", requireAdmin, async (_req, res): Promise<void> => {
  const users = await prisma.user.findMany({
    orderBy: { joinedAt: "desc" },
    include: { sessions: true },
  });

  const result = users.map((u) => {
    const activeSession = u.sessions.find((s) => s.isActive);
    const anySession = u.sessions[0];
    const sessionStatus = activeSession ? "active" : anySession ? "inactive" : null;
    return {
      id: u.id,
      telegramId: u.telegramId,
      username: u.username,
      fullName: u.fullName,
      isBlocked: u.isBlocked,
      joinedAt: u.joinedAt.toISOString(),
      sessionStatus,
    };
  });

  res.json(result);
});

router.get("/users/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw ?? "", 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const u = await prisma.user.findUnique({ where: { id }, include: { sessions: true } });
  if (!u) { res.status(404).json({ error: "User not found" }); return; }

  const activeSession = u.sessions.find((s) => s.isActive);
  const sessionStatus = activeSession ? "active" : u.sessions.length > 0 ? "inactive" : null;

  res.json({
    id: u.id,
    telegramId: u.telegramId,
    username: u.username,
    fullName: u.fullName,
    isBlocked: u.isBlocked,
    joinedAt: u.joinedAt.toISOString(),
    sessionStatus,
  });
});

router.delete("/users/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw ?? "", 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await prisma.user.delete({ where: { id } });
  res.sendStatus(204);
});

router.patch("/users/:id/block", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw ?? "", 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const u = await prisma.user.update({ where: { id }, data: { isBlocked: true }, include: { sessions: true } });
  const sessionStatus = u.sessions.find((s) => s.isActive) ? "active" : u.sessions.length > 0 ? "inactive" : null;

  res.json({ id: u.id, telegramId: u.telegramId, username: u.username, fullName: u.fullName, isBlocked: u.isBlocked, joinedAt: u.joinedAt.toISOString(), sessionStatus });
});

router.patch("/users/:id/unblock", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw ?? "", 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const u = await prisma.user.update({ where: { id }, data: { isBlocked: false }, include: { sessions: true } });
  const sessionStatus = u.sessions.find((s) => s.isActive) ? "active" : u.sessions.length > 0 ? "inactive" : null;

  res.json({ id: u.id, telegramId: u.telegramId, username: u.username, fullName: u.fullName, isBlocked: u.isBlocked, joinedAt: u.joinedAt.toISOString(), sessionStatus });
});

router.get("/users/:id/tasks", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw ?? "", 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const user = await prisma.user.findUnique({ where: { id }, include: { sessions: true } });
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const sessionIds = user.sessions.map((s) => s.id);
  const tasks = await prisma.scheduledTask.findMany({
    where: { sessionId: { in: sessionIds } },
    include: { contact: true, session: { include: { user: true } } },
    orderBy: { createdAt: "desc" },
  });

  res.json(tasks.map((t) => ({
    id: t.id, sessionId: t.sessionId, contactId: t.contactId, messageText: t.messageText,
    scheduleType: t.scheduleType, scheduleTime: t.scheduleTime, scheduleDate: t.scheduleDate,
    isActive: t.isActive, lastSent: t.lastSent?.toISOString() ?? null, sentCount: t.sentCount,
    createdAt: t.createdAt.toISOString(), contactName: t.contact?.name ?? null,
    userFullName: t.session.user.fullName,
  })));
});

router.get("/users/:id/contacts", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw ?? "", 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const user = await prisma.user.findUnique({ where: { id }, include: { sessions: true } });
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const sessionIds = user.sessions.map((s) => s.id);
  const contacts = await prisma.contact.findMany({ where: { sessionId: { in: sessionIds } } });

  res.json(contacts.map((c) => ({ id: c.id, sessionId: c.sessionId, telegramId: c.telegramId, name: c.name, username: c.username })));
});

export default router;
