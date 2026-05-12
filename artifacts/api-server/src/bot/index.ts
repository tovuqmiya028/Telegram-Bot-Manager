import { Bot, session, type Context } from "grammy";
import { prisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { Api } from "telegram/tl/index.js";

const BOT_TOKEN = process.env["BOT_TOKEN"] ?? "";

if (!BOT_TOKEN) {
  logger.warn("BOT_TOKEN not set — Telegram bot will not start");
}

export const bot = new Bot(BOT_TOKEN || "placeholder");

type MySession = {
  step?: "awaiting_phone" | "awaiting_otp" | "awaiting_password" | "awaiting_autoreply_text";
  phone?: string;
  phoneCodeHash?: string;
};

type MyContext = Context & { session: MySession };

bot.use(session({ initial: (): MySession => ({}) }));

const loginClients: Map<number, TelegramClient> = new Map();
const activeClients: Map<number, TelegramClient> = new Map();

process.on('SIGINT', async () => {
    logger.info("SIGINT received. Disconnecting all clients...");
    for (const client of [...loginClients.values(), ...activeClients.values()]) {
        if (client.connected) await client.disconnect();
    }
    process.exit(0);
});

async function cleanupLoginAttempt(userId: number) {
    const client = loginClients.get(userId);
    if (client) {
        logger.info({ userId }, "Cleaning up previous login attempt.");
        if (client.connected) {
            await client.disconnect().catch(err => logger.warn({ err, userId }, "Error during client disconnect on cleanup."));
        }
        loginClients.delete(userId);
    }
}

bot.command("start", async (ctx: MyContext) => {
  await cleanupLoginAttempt(ctx.from!.id);
  ctx.session = {};
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

bot.command("cancel", async (ctx: MyContext) => {
    await cleanupLoginAttempt(ctx.from!.id);
    ctx.session = {};
    await ctx.reply("🚫 Jarayon bekor qilindi. Barcha vaqtinchalik ulanishlar to'xtatildi.\n\n/start buyrug'i bilan bosh menyuga qaytishingiz mumkin.");
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
    
  await cleanupLoginAttempt(ctx.from!.id);

  ctx.session.step = "awaiting_phone";
  await ctx.reply("📱 Telegram telefon raqamingizni kiriting (+998901234567 formatida):");
});

bot.on("message:text", async (ctx: MyContext) => {
  const userId = ctx.from.id;
  const text = ctx.message.text;
  const step = ctx.session.step;

  if (!step) return;

  const user = await prisma.user.findUnique({ where: { telegramId: String(userId) } });
  if (!user || user.isBlocked) return;
    
  if (step === "awaiting_phone") {
    const apiId = parseInt(process.env["TELEGRAM_API_ID"] ?? "0");
    const apiHash = process.env["TELEGRAM_API_HASH"] ?? "";

    if (!apiId || !apiHash) {
      await ctx.reply("⚠️ API sozlamalari yo'q. Admin bilan bog'laning.");
      ctx.session = {};
      return;
    }

    const client = new TelegramClient(new StringSession(""), apiId, apiHash, { connectionRetries: 3 });
    loginClients.set(userId, client);

    try {
      await client.connect();
      const result = await client.sendCode({ apiId, apiHash }, text);
      ctx.session.phone = text;
      ctx.session.phoneCodeHash = result.phoneCodeHash;
      ctx.session.step = "awaiting_otp";
      await ctx.reply("📨 SMS kodi yuborildi! Iltimos, kodni kiriting. Kodni `12345` yoki `12-34-5` kabi formatlarda yuborishingiz mumkin.\n\n(Jarayonni bekor qilish uchun /cancel deb yozing)");
    } catch (err: any) {
      logger.error({ err, userId }, "Failed to send OTP code");
      await cleanupLoginAttempt(userId);
      ctx.session = {};
      await ctx.reply(`❌ Kod yuborishda xatolik yuz berdi. Iltimos, raqamni to'g'ri formatda kiritganingizga ishonch hosil qiling va qaytadan urinib ko'ring.\n\n_(${err.message})_`);
    }
    return;
  }

  const client = loginClients.get(userId);
  if (!client) {
      await ctx.reply("❌ Sessiya muddati o'tdi yoki topilmadi. Qaytadan /start bosing va urinib ko'ring.");
      ctx.session = {};
      return;
  }

  if (step === "awaiting_otp") {
    const sanitizedCode = text.replace(/\D/g, ''); // Raqamlardan boshqa hamma narsani o'chirish
    const { phone, phoneCodeHash } = ctx.session;
    try {
      await client.invoke(new Api.auth.SignIn({
        phoneNumber: phone!,
        phoneCodeHash: phoneCodeHash!,
        phoneCode: sanitizedCode, // Tozalangan kodni ishlatish
      }));
      await completeLogin(ctx, client, user.id, phone!);
    } catch (err: any) {
      if (err.errorMessage === "SESSION_PASSWORD_NEEDED") {
        ctx.session.step = "awaiting_password";
        await ctx.reply("🔒 Sizning akkauntingizda ikki bosqichli tekshiruv (2FA) yoqilgan. Iltimos, maxfiy so'zni (parolni) kiriting:");
      } else if (err.errorMessage === "AUTH_KEY_UNREGISTERED") {
        logger.error({ err, userId }, "Fatal session error during OTP sign-in.");
        await cleanupLoginAttempt(userId);
        ctx.session = {};
        await ctx.reply("❌ Jiddiy xatolik: Sessiya kaliti yaroqsiz. Iltimos, /start bosing va jarayonni boshidan boshlang.");
      } else {
        logger.warn({ err, userId }, "OTP Sign-in error");
        await ctx.reply(`❌ Noto'g'ri kod. Qaytadan kiriting:\n\n_(${err.message})_`);
      }
    }
    return;
  }

  if (step === "awaiting_password") {
    const { phone } = ctx.session;
    try {
        const passwordSrp = await client.invoke(new Api.account.GetPassword({}));
        const password = await TelegramClient.passwordToHash(text, passwordSrp.currentSalt!);
        await client.invoke(new Api.auth.CheckPassword({
            password: new Api.InputCheckPasswordSRP({ srpId: passwordSrp.srpId, a: password.a, m1: password.m1 })
        }));
      await completeLogin(ctx, client, user.id, phone!);
    } catch (err: any) {
        logger.error({ err, userId }, "2FA Sign-in error");
        if (err.errorMessage === "AUTH_KEY_UNREGISTERED") {
            await cleanupLoginAttempt(userId);
            ctx.session = {};
            await ctx.reply("❌ Jiddiy xatolik: Sessiya kaliti yaroqsiz. Iltimos, /start bosing va jarayonni boshidan boshlang.");
        } else {
            await ctx.reply(`❌ Parol noto'g'ri. Qaytadan kiriting:\n\n_(${err.message})_`);
        }
    }
    return;
  }
});

async function completeLogin(ctx: MyContext, client: TelegramClient, dbUserId: number, phone: string) {
    const sessionString = client.session.save() as unknown as string;

    await prisma.session.upsert({
      where: { userId_phone: { userId: dbUserId, phone } } as any,
      create: { userId: dbUserId, phone, sessionString, isActive: true },
      update: { sessionString, isActive: true },
    });

    activeClients.set(dbUserId, client);
    loginClients.delete(ctx.from!.id);
    
    logger.info({ userId: dbUserId }, "Session connected successfully");
    await ctx.reply("✅ Akkaunt muvaffaqiyatli ulandi!");
    ctx.session = {};
}

bot.hears("⏰ Rejalashtirilgan xabarlar", async (ctx: MyContext) => {});

bot.hears("🏠 Bosh menyu", async (ctx: MyContext) => {
  ctx.session = {};
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

export async function startBot(): Promise<void> {
  if (!BOT_TOKEN) {
    logger.warn("BOT_TOKEN not set — skipping bot start");
    return;
  }
  await bot.api.deleteWebhook({ drop_pending_updates: true }).catch((err) => logger.warn("Could not delete webhook", err));
  bot.start({
    onStart: () => logger.info("Telegram bot started with polling"),
  }).catch((err) => logger.error({ err }, "Bot startup error"));
}
