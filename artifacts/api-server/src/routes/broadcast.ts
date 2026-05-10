import { Router, type IRouter } from "express";
import { requireAdmin } from "../lib/auth.js";
import { prisma } from "../lib/prisma.js";
import { SendBroadcastBody } from "@workspace/api-zod";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

router.post("/broadcast", requireAdmin, async (req, res): Promise<void> => {
  const parsed = SendBroadcastBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { message } = parsed.data;
  const users = await prisma.user.findMany({ where: { isBlocked: false } });

  let sent = 0;
  let failed = 0;

  // Import bot lazily to avoid issues if BOT_TOKEN not set
  try {
    const { bot } = await import("../bot/index.js");
    for (const user of users) {
      try {
        await bot.api.sendMessage(user.telegramId, message);
        sent++;
      } catch (err) {
        logger.warn({ err, userId: user.id }, "Failed to send broadcast to user");
        failed++;
      }
    }
  } catch (err) {
    logger.warn({ err }, "Bot not available for broadcast, recording as failed");
    failed = users.length;
  }

  res.json({ sent, failed, total: users.length });
});

export default router;
