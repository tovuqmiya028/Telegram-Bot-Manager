import { Router, type IRouter } from "express";
import { requireAdmin } from "../lib/auth.js";
import { prisma } from "../lib/prisma.js";

const router: IRouter = Router();

router.get("/dashboard/stats", requireAdmin, async (_req, res): Promise<void> => {
  const [totalUsers, activeSessions, totalTasks, totalLogs, blockedUsers, successfulLogs, failedLogs] =
    await Promise.all([
      prisma.user.count(),
      prisma.session.count({ where: { isActive: true } }),
      prisma.scheduledTask.count(),
      prisma.log.count(),
      prisma.user.count({ where: { isBlocked: true } }),
      prisma.log.count({ where: { status: "success" } }),
      prisma.log.count({ where: { status: "fail" } }),
    ]);
  res.json({ totalUsers, activeSessions, totalTasks, totalLogs, blockedUsers, successfulLogs, failedLogs });
});

router.get("/dashboard/recent-logs", requireAdmin, async (_req, res): Promise<void> => {
  const logs = await prisma.log.findMany({
    orderBy: { sentAt: "desc" },
    take: 20,
    include: {
      session: { include: { user: true } },
      contact: true,
      task: true,
    },
  });

  const result = logs.map((log) => ({
    id: log.id,
    sessionId: log.sessionId,
    contactId: log.contactId,
    taskId: log.taskId,
    status: log.status,
    sentAt: log.sentAt.toISOString(),
    userFullName: log.session?.user?.fullName ?? null,
    contactName: log.contact?.name ?? null,
    messageText: log.task?.messageText ?? log.message ?? null,
  }));

  res.json(result);
});

export default router;
