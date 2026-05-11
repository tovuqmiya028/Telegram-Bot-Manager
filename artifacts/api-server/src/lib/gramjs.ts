import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { Api } from "telegram";
import { logger } from "./logger.js";

const API_ID = parseInt(process.env["TELEGRAM_API_ID"] ?? "0", 10);
const API_HASH = process.env["TELEGRAM_API_HASH"] ?? "";

interface PendingAuth {
  client: TelegramClient;
  phoneCodeHash: string;
  expiresAt: number;
}

const pendingAuth = new Map<string, PendingAuth>();

function cleanExpired() {
  const now = Date.now();
  for (const [phone, entry] of pendingAuth.entries()) {
    if (entry.expiresAt < now) {
      entry.client.disconnect().catch(() => {});
      pendingAuth.delete(phone);
    }
  }
}

export async function requestCode(phone: string): Promise<{ phoneCodeHash: string }> {
  if (!API_ID || !API_HASH) {
    throw new Error("TELEGRAM_API_ID or TELEGRAM_API_HASH not configured");
  }

  cleanExpired();

  const existing = pendingAuth.get(phone);
  if (existing) {
    try { await existing.client.disconnect(); } catch {}
    pendingAuth.delete(phone);
  }

  const client = new TelegramClient(new StringSession(""), API_ID, API_HASH, {
    connectionRetries: 3,
    useWSS: false,
  });

  await client.connect();

  const result = await client.sendCode(
    { apiId: API_ID, apiHash: API_HASH },
    phone,
  );

  pendingAuth.set(phone, {
    client,
    phoneCodeHash: result.phoneCodeHash,
    expiresAt: Date.now() + 5 * 60 * 1000,
  });

  logger.info({ phone }, "Telegram code sent");
  return { phoneCodeHash: result.phoneCodeHash };
}

export async function verifyCode(
  phone: string,
  code: string,
  phoneCodeHash: string,
): Promise<{
  sessionString: string;
  firstName: string;
  lastName: string;
  username: string;
  telegramId: string;
}> {
  const pending = pendingAuth.get(phone);
  if (!pending) {
    throw new Error("Kod muddati o'tdi yoki telefon raqam topilmadi. Qaytadan so'rang.");
  }

  const { client } = pending;

  try {
    await client.invoke(
      new Api.auth.SignIn({
        phoneNumber: phone,
        phoneCodeHash,
        phoneCode: code,
      }),
    );
  } catch (err: any) {
    if (err.errorMessage === "SESSION_PASSWORD_NEEDED") {
      throw new Error("Bu akkauntda ikki bosqichli tasdiqlash yoqilgan. Hozircha qo'llab-quvvatlanmaydi.");
    }
    throw new Error(`Tasdiqlash xatosi: ${err.errorMessage ?? err.message}`);
  }

  const me = await client.getMe();
  const sessionString = client.session.save() as unknown as string;

  pendingAuth.delete(phone);

  return {
    sessionString,
    firstName: (me as any).firstName ?? "",
    lastName: (me as any).lastName ?? "",
    username: (me as any).username ?? "",
    telegramId: String((me as any).id ?? ""),
  };
}
