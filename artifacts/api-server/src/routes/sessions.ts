import { Router, type IRouter } from "express";
import { requireAdmin } from "../lib/auth.js";
import { prisma } from "../lib/prisma.js";
import { requestCode, verifyCode } from "../lib/gramjs.js";

const router: IRouter = Router();

router.get("/sessions", requireAdmin, async (_req, res): Promise<void> => {
  const sessions = await prisma.session.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: true },
  });

  res.json(sessions.map((s) => ({
    id: s.id, userId: s.userId, phone: s.phone, isActive: s.isActive,
    createdAt: s.createdAt.toISOString(),
    userFullName: s.user.fullName, userUsername: s.user.username,
  })));
});

router.get("/sessions/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw ?? "", 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const s = await prisma.session.findUnique({ where: { id }, include: { user: true } });
  if (!s) { res.status(404).json({ error: "Session not found" }); return; }

  res.json({ id: s.id, userId: s.userId, phone: s.phone, isActive: s.isActive, createdAt: s.createdAt.toISOString(), userFullName: s.user.fullName, userUsername: s.user.username });
});

router.patch("/sessions/:id/disconnect", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw ?? "", 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const s = await prisma.session.update({ where: { id }, data: { isActive: false, sessionString: "" }, include: { user: true } });
  res.json({ id: s.id, userId: s.userId, phone: s.phone, isActive: s.isActive, createdAt: s.createdAt.toISOString(), userFullName: s.user.fullName, userUsername: s.user.username });
});

router.get("/sessions/:id/contacts", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw ?? "", 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const contacts = await prisma.contact.findMany({ where: { sessionId: id } });
  res.json(contacts.map((c) => ({ id: c.id, sessionId: c.sessionId, telegramId: c.telegramId, name: c.name, username: c.username })));
});

router.post("/sessions/request-code", requireAdmin, async (req, res): Promise<void> => {
  const { phone } = req.body as { phone?: string };
  if (!phone) { res.status(400).json({ error: "phone is required" }); return; }

  try {
    const result = await requestCode(phone.trim());
    res.json({ phone: phone.trim(), phoneCodeHash: result.phoneCodeHash });
  } catch (err: any) {
    res.status(400).json({ error: err.message ?? "Failed to send code" });
  }
});

router.post("/sessions/verify-code", requireAdmin, async (req, res): Promise<void> => {
  const { phone, code, phoneCodeHash } = req.body as { phone?: string; code?: string; phoneCodeHash?: string };
  if (!phone || !code || !phoneCodeHash) {
    res.status(400).json({ error: "phone, code, and phoneCodeHash are required" });
    return;
  }

  try {
    const { sessionString, firstName, lastName, username, telegramId } = await verifyCode(
      phone.trim(), code.trim(), phoneCodeHash,
    );

    let user = await prisma.user.findFirst({ where: { telegramId } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          telegramId,
          fullName: [firstName, lastName].filter(Boolean).join(" ") || phone,
          username: username || null,
          isBlocked: false,
          joinedAt: new Date(),
        },
      });
    }

    const session = await prisma.session.create({
      data: {
        userId: user.id,
        phone: phone.trim(),
        sessionString,
        isActive: true,
      },
      include: { user: true },
    });

    res.json({
      id: session.id,
      userId: session.userId,
      phone: session.phone,
      isActive: session.isActive,
      createdAt: session.createdAt.toISOString(),
      userFullName: session.user?.fullName ?? null,
      userUsername: session.user?.username ?? null,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message ?? "Verification failed" });
  }
});

export default router;
