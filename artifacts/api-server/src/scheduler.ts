import cron from "node-cron";
import { prisma } from "./lib/prisma.js";
import { logger } from "./lib/logger.js";
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";

const activeClients: Map<number, TelegramClient> = new Map();

async function getClient(session: { id: number; sessionString: string }): Promise<TelegramClient | null> {
  if (activeClients.has(session.id)) return activeClients.get(session.id)!;

  const apiId = parseInt(process.env["TELEGRAM_API_ID"] ?? "0");
  const apiHash = process.env["TELEGRAM_API_HASH"] ?? "";
  if (!apiId || !apiHash || !session.sessionString) return null;

  try {
    const client = new TelegramClient(new StringSession(session.sessionString), apiId, apiHash, {
      connectionRetries: 2,
    });
    await client.connect();
    activeClients.set(session.id, client);
    return client;
  } catch (err) {
    logger.error({ err, sessionId: session.id }, "Failed to connect TelegramClient");
    return null;
  }
}

function getTimezone(): string {
  return process.env["TIMEZONE"] ?? "Asia/Tashkent";
}

function getCurrentHHMM(): string {
  return new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: getTimezone(),
  });
}

function getCurrentDate(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: getTimezone() });
}

export function startScheduler(): void {
  cron.schedule("* * * * *", async () => {
    const currentTime = getCurrentHHMM();
    const currentDate = getCurrentDate();

    const tasks = await prisma.scheduledTask.findMany({
      where: {
        isActive: true,
        scheduleTime: currentTime,
        session: { isActive: true },
      },
      include: {
        session: true,
        contact: true,
      },
    });

    for (const task of tasks) {
      // For "once" tasks, check if the date matches
      if (task.scheduleType === "once") {
        if (task.scheduleDate !== currentDate) continue;
        // If date matched, check if already sent today
        if (task.lastSent && task.lastSent.toLocaleDateString("en-CA", { timeZone: getTimezone() }) === currentDate) continue;
      }

      // For "daily" tasks, check if already sent today
      if (task.scheduleType === "daily") {
        if (task.lastSent && task.lastSent.toLocaleDateString("en-CA", { timeZone: getTimezone() }) === currentDate) continue;
      }

      const client = await getClient(task.session);
      let status = "fail";

      if (client && task.contact) {
        try {
          const entity = await client.getEntity(task.contact.telegramId);
          await client.sendMessage(entity, { message: task.messageText });
          status = "success";
          logger.info({ taskId: task.id }, "Scheduled message sent");
        } catch (err) {
          logger.error({ err, taskId: task.id }, "Failed to send scheduled message");
        }
      }

      // Update task
      await prisma.scheduledTask.update({
        where: { id: task.id },
        data: {
          lastSent: new Date(),
          sentCount: { increment: 1 },
          // Deactivate "once" tasks after sending
          ...(task.scheduleType === "once" ? { isActive: false } : {}),
        },
      });

      // Log result
      await prisma.log.create({
        data: {
          sessionId: task.sessionId,
          contactId: task.contactId,
          taskId: task.id,
          status,
          message: task.messageText,
        },
      });
    }
  });

  logger.info("Scheduler started — checking tasks every minute");
}
