import { Router, type IRouter } from "express";
import { requireAdmin } from "../lib/auth.js";
import { prisma } from "../lib/prisma.js";
import { GetTasksQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/tasks", requireAdmin, async (req, res): Promise<void> => {
  const parsed = GetTasksQueryParams.safeParse(req.query);
  const userId = parsed.success ? parsed.data.userId : undefined;

  let sessionIds: number[] | undefined;
  if (userId != null) {
    const user = await prisma.user.findUnique({ where: { id: userId }, include: { sessions: true } });
    sessionIds = user?.sessions.map((s) => s.id);
  }

  const tasks = await prisma.scheduledTask.findMany({
    where: sessionIds != null ? { sessionId: { in: sessionIds } } : undefined,
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

router.post("/tasks", requireAdmin, async (req, res): Promise<void> => {
  const { sessionId, contactId, messageText, scheduleType, scheduleTime, scheduleDate } =
    req.body as {
      sessionId?: number; contactId?: number; messageText?: string;
      scheduleType?: string; scheduleTime?: string; scheduleDate?: string;
    };

  if (!sessionId || !messageText || !scheduleType || !scheduleTime) {
    res.status(400).json({ error: "sessionId, messageText, scheduleType, scheduleTime are required" });
    return;
  }

  const t = await prisma.scheduledTask.create({
    data: {
      sessionId, contactId: contactId ?? null,
      messageText, scheduleType, scheduleTime,
      scheduleDate: scheduleDate ?? null,
      isActive: true, sentCount: 0,
    },
    include: { contact: true, session: { include: { user: true } } },
  });

  res.status(201).json({
    id: t.id, sessionId: t.sessionId, contactId: t.contactId, messageText: t.messageText,
    scheduleType: t.scheduleType, scheduleTime: t.scheduleTime, scheduleDate: t.scheduleDate,
    isActive: t.isActive, lastSent: null, sentCount: t.sentCount,
    createdAt: t.createdAt.toISOString(), contactName: t.contact?.name ?? null,
    userFullName: t.session?.user?.fullName ?? null,
  });
});

router.delete("/tasks/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw ?? "", 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await prisma.scheduledTask.delete({ where: { id } });
  res.sendStatus(204);
});

router.patch("/tasks/:id/pause", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw ?? "", 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const t = await prisma.scheduledTask.update({
    where: { id }, data: { isActive: false },
    include: { contact: true, session: { include: { user: true } } },
  });

  res.json({ id: t.id, sessionId: t.sessionId, contactId: t.contactId, messageText: t.messageText, scheduleType: t.scheduleType, scheduleTime: t.scheduleTime, scheduleDate: t.scheduleDate, isActive: t.isActive, lastSent: t.lastSent?.toISOString() ?? null, sentCount: t.sentCount, createdAt: t.createdAt.toISOString(), contactName: t.contact?.name ?? null, userFullName: t.session.user.fullName });
});

router.patch("/tasks/:id/resume", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw ?? "", 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const t = await prisma.scheduledTask.update({
    where: { id }, data: { isActive: true },
    include: { contact: true, session: { include: { user: true } } },
  });

  res.json({ id: t.id, sessionId: t.sessionId, contactId: t.contactId, messageText: t.messageText, scheduleType: t.scheduleType, scheduleTime: t.scheduleTime, scheduleDate: t.scheduleDate, isActive: t.isActive, lastSent: t.lastSent?.toISOString() ?? null, sentCount: t.sentCount, createdAt: t.createdAt.toISOString(), contactName: t.contact?.name ?? null, userFullName: t.session.user.fullName });
});

export default router;
