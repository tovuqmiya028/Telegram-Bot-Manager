import { PrismaClient } from "./generated/prisma/index.js";

const prisma = new PrismaClient({
  datasources: { db: { url: process.env["DATABASE_URL"] ?? "file:./dev.db" } },
});

async function seed() {
  const user1 = await prisma.user.upsert({
    where: { telegramId: "123456789" },
    create: { telegramId: "123456789", fullName: "Ali Rahimov", username: "ali_r", isBlocked: false },
    update: {},
  });
  const user2 = await prisma.user.upsert({
    where: { telegramId: "987654321" },
    create: { telegramId: "987654321", fullName: "Dilnoza Karimova", username: "dilnoza_k", isBlocked: false },
    update: {},
  });
  await prisma.user.upsert({
    where: { telegramId: "555000111" },
    create: { telegramId: "555000111", fullName: "Bobur Toshmatov", username: "bobur_t", isBlocked: true },
    update: {},
  });

  const sess1 = await prisma.session.create({
    data: { userId: user1.id, phone: "+998901234567", sessionString: "demo_session_1", isActive: true },
  });
  const sess2 = await prisma.session.create({
    data: { userId: user2.id, phone: "+998907654321", sessionString: "demo_session_2", isActive: false },
  });

  const c1 = await prisma.contact.create({
    data: { sessionId: sess1.id, telegramId: "111222333", name: "Sardor Boltayev", username: "sardor_b" },
  });
  const c2 = await prisma.contact.create({
    data: { sessionId: sess1.id, telegramId: "444555666", name: "Nodira Xasanova", username: "nodira_x" },
  });
  const c3 = await prisma.contact.create({
    data: { sessionId: sess2.id, telegramId: "777888999", name: "Jasur Mirzayev", username: null },
  });

  const t1 = await prisma.scheduledTask.create({
    data: {
      sessionId: sess1.id, contactId: c1.id,
      messageText: "Bugun uchrashuvimiz soat 15:00 da. Unutmang!",
      scheduleType: "daily", scheduleTime: "09:00", isActive: true, sentCount: 5,
    },
  });
  const t2 = await prisma.scheduledTask.create({
    data: {
      sessionId: sess1.id, contactId: c2.id,
      messageText: "Salom! Loyiha hujjatlarini yubordingizmi?",
      scheduleType: "once", scheduleTime: "14:30", scheduleDate: "2026-05-15", isActive: true, sentCount: 0,
    },
  });
  const t3 = await prisma.scheduledTask.create({
    data: {
      sessionId: sess2.id, contactId: c3.id,
      messageText: "Haftalik hisobot tayyormi? Biror muammo bolsa xabar bering.",
      scheduleType: "daily", scheduleTime: "17:00", isActive: false, sentCount: 12,
    },
  });

  await prisma.autoReply.create({
    data: { sessionId: sess1.id, replyText: "Hozir band, birozdan keyin javob beraman.", isEnabled: true },
  });

  const logsData = [
    { sessionId: sess1.id, contactId: c1.id, taskId: t1.id, status: "success", message: "Bugun uchrashuvimiz soat 15:00 da. Unutmang!" },
    { sessionId: sess1.id, contactId: c2.id, taskId: t2.id, status: "success", message: "Salom! Loyiha hujjatlarini yubordingizmi?" },
    { sessionId: sess2.id, contactId: c3.id, taskId: t3.id, status: "fail", message: "Haftalik hisobot tayyormi?" },
    { sessionId: sess1.id, contactId: c1.id, taskId: t1.id, status: "success", message: "Bugun uchrashuvimiz soat 15:00 da. Unutmang!" },
    { sessionId: sess1.id, contactId: c1.id, taskId: t1.id, status: "fail", message: "Bugun uchrashuvimiz soat 15:00 da." },
  ];
  for (const l of logsData) {
    await prisma.log.create({ data: l });
  }

  console.log("Seed complete!");
  await prisma.$disconnect();
}

seed().catch((e) => { console.error(e); process.exit(1); });
