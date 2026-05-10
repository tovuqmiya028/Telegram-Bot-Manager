import { Bot, session, type Context } from "grammy";
import { prisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { Api } from "telegram/tl/index.js";

const BOT_TOKEN = process.env["BOT_TOKEN"] ?? "";
const ADMIN_TELEGRAM_ID = process.env["ADMIN_TELEGRAM_ID"] ?? "";

if (!BOT_TOKEN) {
  logger.warn("BOT_TOKEN not set — Telegram bot will not start");
}

export const bot = new Bot(BOT_TOKEN || "placeholder");

type MySession = {
  step?: string;
  phone?: string;
  phoneCodeHash?: string;
  sessionObj?: string;
  taskDraft?: {
    contactId?: number;
    message?: string;
    type?: string;
    time?: string;
    date?: string;
  };
};

type MyContext = Context & { session: MySession };

bot.use(session({ initial: (): MySession => ({}) }));

// Active GramJS clients keyed by userId (db User.id)
const activeClients: Map<number, TelegramClient> = new Map();

async function getOrCreateClient(userId: number, sessionString: string): Promise<TelegramClient | null> {
  if (activeClients.has(userId)) return activeClients.get(userId)!;
  const apiId = parseInt(process.env["TELEGRAM_API_ID"] ?? "0");
  const apiHash = process.env["TELEGRAM_API_HASH"] ?? "";
  if (!apiId || !apiHash) return null;
  const client = new TelegramClient(new StringSession(sessionString), apiId, apiHash, { connectionRetries: 3 });
  await client.connect();
  activeClients.set(userId, client);
  return client;
}

bot.command("start", async (ctx: MyContext) => {
  const telegramId = String(ctx.from?.id ?? "");
  const fullName = [ctx.from?.first_name, ctx.from?.last_name].filter(Boolean).join(" ") || "User";
  const username = ctx.from?.username ?? null;

  let user = await prisma.user.findUnique({ where: { telegramId } });
  if (!user) {
    user = await prisma.user.create({ data: { telegramId, fullName, username } });
  }

  if (user.isBlocked) {
    await ctx.reply("⛔ Siz bloklangan. Admin bilan bog'laning.");
    return;
  }

  await ctx.reply(
    `👋 Salom, ${fullName}! Telegram Userbot boshqaruv botiga xush kelibsiz.\n\nNima qilmoqchisiz?`,
    {
      reply_markup: {
        keyboard: [
          [{ text: "🔗 Akkauntni ulash" }, { text: "⏰ Rejalashtirilgan xabarlar" }],
          [{ text: "🤖 Avto-javob sozlamalari" }, { text: "📋 Mening vazifalarim" }],
        ],
        resize_keyboard: true,
      },
    }
  );
});

bot.hears("🔗 Akkauntni ulash", async (ctx: MyContext) => {
  const telegramId = String(ctx.from?.id ?? "");
  const user = await prisma.user.findUnique({ where: { telegramId } });
  if (!user || user.isBlocked) { await ctx.reply("⛔ Ruxsat yo'q."); return; }

  const session = await prisma.session.findFirst({ where: { userId: user.id, isActive: true } });
  if (session) {
    await ctx.reply(`✅ Sizning akkauntingiz allaqachon ulangan: ${session.phone}`);
    return;
  }

  ctx.session.step = "awaiting_phone";
  await ctx.reply("📱 Telegram telefon raqamingizni kiriting (+998901234567 formatida):");
});

bot.hears("⏰ Rejalashtirilgan xabarlar", async (ctx: MyContext) => {
  const telegramId = String(ctx.from?.id ?? "");
  const user = await prisma.user.findUnique({ where: { telegramId } });
  if (!user || user.isBlocked) { await ctx.reply("⛔ Ruxsat yo'q."); return; }

  const session = await prisma.session.findFirst({ where: { userId: user.id, isActive: true } });
  if (!session) {
    await ctx.reply("⚠️ Avval akkauntingizni ulang. '🔗 Akkauntni ulash' tugmasini bosing.");
    return;
  }

  const tasks = await prisma.scheduledTask.findMany({
    where: { sessionId: session.id },
    include: { contact: true },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  if (tasks.length === 0) {
    await ctx.reply("📭 Hozircha rejalashtirilgan xabar yo'q.", {
      reply_markup: {
        keyboard: [[{ text: "➕ Yangi vazifa qo'shish" }], [{ text: "🏠 Bosh menyu" }]],
        resize_keyboard: true,
      },
    });
    return;
  }

  let text = "📋 Sizning vazifalaringiz:\n\n";
  for (const task of tasks) {
    const status = task.isActive ? "✅ Faol" : "⏸ To'xtatilgan";
    text += `🆔 #${task.id} | ${status}\n`;
    text += `👤 ${task.contact?.name ?? "Noma'lum"}\n`;
    text += `💬 ${task.messageText.slice(0, 50)}...\n`;
    text += `⏰ ${task.scheduleType === "daily" ? "Har kuni" : "Bir marta"} ${task.scheduleTime}\n\n`;
  }

  await ctx.reply(text, {
    reply_markup: {
      keyboard: [[{ text: "➕ Yangi vazifa qo'shish" }], [{ text: "🏠 Bosh menyu" }]],
      resize_keyboard: true,
    },
  });
});

bot.hears("🤖 Avto-javob sozlamalari", async (ctx: MyContext) => {
  const telegramId = String(ctx.from?.id ?? "");
  const user = await prisma.user.findUnique({ where: { telegramId } });
  if (!user || user.isBlocked) { await ctx.reply("⛔ Ruxsat yo'q."); return; }

  const session = await prisma.session.findFirst({ where: { userId: user.id, isActive: true } });
  if (!session) { await ctx.reply("⚠️ Avval akkauntingizni ulang."); return; }

  let autoReply = await prisma.autoReply.findUnique({ where: { sessionId: session.id } });
  if (!autoReply) {
    autoReply = await prisma.autoReply.create({ data: { sessionId: session.id, replyText: "Hozir band, keyinroq javob beraman.", isEnabled: false } });
  }

  const status = autoReply.isEnabled ? "✅ Yoqilgan" : "❌ O'chirilgan";
  await ctx.reply(
    `🤖 Avto-javob: ${status}\n\n💬 Joriy matn: "${autoReply.replyText}"\n\nNima qilmoqchisiz?`,
    {
      reply_markup: {
        keyboard: [
          [{ text: autoReply.isEnabled ? "❌ O'chirish" : "✅ Yoqish" }],
          [{ text: "✏️ Matnni o'zgartirish" }],
          [{ text: "🏠 Bosh menyu" }],
        ],
        resize_keyboard: true,
      },
    }
  );
});

bot.hears("📋 Mening vazifalarim", async (ctx: MyContext) => {
  const telegramId = String(ctx.from?.id ?? "");
  const user = await prisma.user.findUnique({ where: { telegramId } });
  if (!user || user.isBlocked) { await ctx.reply("⛔ Ruxsat yo'q."); return; }

  const session = await prisma.session.findFirst({ where: { userId: user.id, isActive: true } });
  if (!session) { await ctx.reply("⚠️ Avval akkauntingizni ulang."); return; }

  const tasks = await prisma.scheduledTask.findMany({
    where: { sessionId: session.id, isActive: true },
    include: { contact: true },
    orderBy: { createdAt: "desc" },
  });

  if (tasks.length === 0) {
    await ctx.reply("📭 Faol vazifalar yo'q.");
    return;
  }

  for (const task of tasks) {
    const text = `🆔 #${task.id}\n👤 ${task.contact?.name ?? "Noma'lum"}\n💬 ${task.messageText.slice(0, 100)}\n⏰ ${task.scheduleType === "daily" ? "Har kuni" : "Bir marta"} ${task.scheduleTime}`;
    await ctx.reply(text, {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "⏸ To'xtatish", callback_data: `pause_task_${task.id}` },
            { text: "🗑 O'chirish", callback_data: `delete_task_${task.id}` },
          ],
        ],
      },
    });
  }
});

bot.callbackQuery(/^pause_task_(\d+)$/, async (ctx) => {
  const taskId = parseInt(ctx.match[1] ?? "0");
  await prisma.scheduledTask.update({ where: { id: taskId }, data: { isActive: false } });
  await ctx.answerCallbackQuery({ text: "⏸ Vazifa to'xtatildi" });
  await ctx.editMessageReplyMarkup({ reply_markup: { inline_keyboard: [] } });
});

bot.callbackQuery(/^delete_task_(\d+)$/, async (ctx) => {
  const taskId = parseInt(ctx.match[1] ?? "0");
  await prisma.scheduledTask.delete({ where: { id: taskId } });
  await ctx.answerCallbackQuery({ text: "🗑 Vazifa o'chirildi" });
  await ctx.deleteMessage();
});

bot.hears("🏠 Bosh menyu", async (ctx: MyContext) => {
  await ctx.reply("🏠 Bosh menyu", {
    reply_markup: {
      keyboard: [
        [{ text: "🔗 Akkauntni ulash" }, { text: "⏰ Rejalashtirilgan xabarlar" }],
        [{ text: "🤖 Avto-javob sozlamalari" }, { text: "📋 Mening vazifalarim" }],
      ],
      resize_keyboard: true,
    },
  });
});

// Handle text input steps
bot.on("message:text", async (ctx: MyContext) => {
  const telegramId = String(ctx.from?.id ?? "");
  const user = await prisma.user.findUnique({ where: { telegramId } });
  if (!user || user.isBlocked) return;
  const text = ctx.message.text;
  const step = ctx.session.step;

  if (step === "awaiting_phone") {
    ctx.session.phone = text;
    ctx.session.step = "awaiting_otp";

    const apiId = parseInt(process.env["TELEGRAM_API_ID"] ?? "0");
    const apiHash = process.env["TELEGRAM_API_HASH"] ?? "";

    if (!apiId || !apiHash) {
      await ctx.reply("⚠️ API sozlamalari yo'q. Admin bilan bog'laning.");
      ctx.session.step = undefined;
      return;
    }

    try {
      const client = new TelegramClient(new StringSession(""), apiId, apiHash, { connectionRetries: 3 });
      await client.connect();
      const result = await client.invoke(new Api.auth.SendCode({
        phoneNumber: text,
        apiId,
        apiHash,
        settings: new Api.CodeSettings({}),
      }));
      ctx.session.phoneCodeHash = result.phoneCodeHash;
      activeClients.set(-user.id, client);
      await ctx.reply("📨 SMS kodi yuborildi! Iltimos, kodni kiriting:");
    } catch (err) {
      logger.error({ err }, "Failed to send OTP");
      await ctx.reply("❌ Xatolik yuz berdi. Qaytadan urinib ko'ring.");
      ctx.session.step = undefined;
    }
    return;
  }

  if (step === "awaiting_otp") {
    const phone = ctx.session.phone!;
    const phoneCodeHash = ctx.session.phoneCodeHash!;
    const tempClient = activeClients.get(-user.id);

    if (!tempClient) {
      await ctx.reply("❌ Sessiya muddati o'tdi. Qaytadan boshlang.");
      ctx.session.step = undefined;
      return;
    }

    try {
      await tempClient.invoke(new Api.auth.SignIn({ phoneNumber: phone, phoneCodeHash, phoneCode: text }));
      const sessionString = tempClient.session.save() as unknown as string;

      const dbSession = await prisma.session.upsert({
        where: { userId_phone: { userId: user.id, phone } } as Parameters<typeof prisma.session.upsert>[0]["where"],
        create: { userId: user.id, phone, sessionString, isActive: true },
        update: { sessionString, isActive: true },
      });

      activeClients.delete(-user.id);
      activeClients.set(user.id, tempClient);

      logger.info({ userId: user.id, sessionId: dbSession.id }, "Session connected");
      await ctx.reply("✅ Akkaunt muvaffaqiyatli ulandi!");
      ctx.session.step = undefined;
    } catch (err) {
      logger.error({ err }, "Failed to sign in");
      await ctx.reply("❌ Noto'g'ri kod. Qaytadan urinib ko'ring:");
    }
    return;
  }

  if (step === "awaiting_autoreply_text") {
    const session = await prisma.session.findFirst({ where: { userId: user.id, isActive: true } });
    if (!session) { ctx.session.step = undefined; return; }
    await prisma.autoReply.update({ where: { sessionId: session.id }, data: { replyText: text } });
    await ctx.reply("✅ Avto-javob matni yangilandi.");
    ctx.session.step = undefined;
    return;
  }
});

export async function startBot(): Promise<void> {
  if (!BOT_TOKEN) {
    logger.warn("BOT_TOKEN not set — skipping bot start");
    return;
  }
  bot.start({
    onStart: () => logger.info("Telegram bot started"),
  }).catch((err) => logger.error({ err }, "Bot error"));
}
