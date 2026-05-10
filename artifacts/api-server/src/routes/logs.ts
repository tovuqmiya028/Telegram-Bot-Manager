import { Router, type IRouter } from "express";
import { requireAdmin } from "../lib/auth.js";
import { prisma } from "../lib/prisma.js";
import { GetLogsQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/logs", requireAdmin, async (req, res): Promise<void> => {
  const parsed = GetLogsQueryParams.safeParse(req.query);
  const { userId, status } = parsed.success ? parsed.data : { userId: undefined, status: undefined };

  let sessionIds: number[] | undefined;
  if (userId != null) {
    const user = await prisma.user.findUnique({ where: { id: userId }, include: { sessions: true } });
    sessionIds = user?.sessions.map((s) => s.id);
  }

  const logs = await prisma.log.findMany({
    where: {
      ...(sessionIds != null ? { sessionId: { in: sessionIds } } : {}),
      ...(status ? { status } : {}),
    },
    include: {
      session: { include: { user: true } },
      contact: true,
      task: true,
    },
    orderBy: { sentAt: "desc" },
    take: 200,
  });

  res.json(logs.map((l) => ({
    id: l.id, sessionId: l.sessionId, contactId: l.contactId, taskId: l.taskId,
    status: l.status, sentAt: l.sentAt.toISOString(),
    userFullName: l.session?.user?.fullName ?? null,
    contactName: l.contact?.name ?? null,
    messageText: l.task?.messageText ?? l.message ?? null,
  })));
});

export default router;
