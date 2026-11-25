import { Router, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import { consume, getClientIp } from "../lib/rateLimit";
import { issueRapportToken, requireRapportAuth, RAPPORT_SESSION_DAYS } from "../lib/auth";

/** Connexion vérifiée côté serveur à partir des variables d’environnement. */

const router = Router();

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

const clean = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

function getAuthConfig() {
  const firstName = clean(process.env.AUTH_FIRST_NAME);
  const lastName = clean(process.env.AUTH_LAST_NAME);
  const pinHash = process.env.AUTH_PIN_HASH;
  const passwordHash = process.env.AUTH_PASSWORD_HASH;

  if (!firstName || !lastName || !pinHash || !passwordHash) return null;
  return { firstName, lastName, pinHash, passwordHash };
}

/** Normalise un nom : minuscules, sans accents, espaces simples. */
const normalizeName = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

function noStore(res: Response) {
  res.setHeader("Cache-Control", "no-store");
}

interface LoginBody {
  firstName?: unknown;
  lastName?: unknown;
  pin?: unknown;
  password?: unknown;
}

router.post("/login", async (req: Request, res: Response) => {
  noStore(res);

  const authConfig = getAuthConfig();
  if (!process.env.JWT_SECRET || !authConfig) {
    return res.status(503).json({ error: "Connexion non configurée sur le serveur." });
  }

  const body = (req.body ?? {}) as LoginBody;
  const firstName = clean(body.firstName);
  const lastName = clean(body.lastName);
  const pin = clean(body.pin);
  const password = typeof body.password === "string" ? body.password : "";

  if (!firstName || !lastName || !pin || !password) {
    return res.status(400).json({ error: "الرجاء ملء جميع الحقول." });
  }
  if (!/^\d{4,8}$/.test(pin)) {
    return res.status(400).json({ error: "يجب أن يتكون رمز PIN من أرقام فقط." });
  }

  const ip = getClientIp(req as unknown as { headers: Record<string, unknown>; ip?: string });
  const limiterKey = `login:${ip}:${normalizeName(lastName)}:${normalizeName(firstName)}`;
  const limit = consume(limiterKey, LOCK_MINUTES * 60_000, 10);
  if (!limit.allowed) {
    res.setHeader("Retry-After", String(limit.retryAfterSeconds));
    return res.status(429).json({
      error: `عدد المحاولات كبير جدًا. أعد المحاولة بعد ${Math.ceil(limit.retryAfterSeconds / 60)} دقيقة.`,
    });
  }

  try {
    const [passwordOk, pinOk] = await Promise.all([
      bcrypt.compare(password, authConfig.passwordHash),
      bcrypt.compare(pin, authConfig.pinHash),
    ]);
    const namesMatch =
      normalizeName(firstName) === normalizeName(authConfig.firstName) &&
      normalizeName(lastName) === normalizeName(authConfig.lastName);

    if (!namesMatch || !passwordOk || !pinOk) {
      return res.status(401).json({ error: "معلومات تسجيل الدخول غير صحيحة." });
    }

    const token = issueRapportToken("env-auth-user", "chef");

    return res.json({
      token,
      expiresInDays: RAPPORT_SESSION_DAYS,
      user: {
        id: "env-auth-user",
        firstName: authConfig.firstName,
        lastName: authConfig.lastName,
        role: "chef",
      },
    });
  } catch (error) {
    console.error("[auth] login:", error);
    return res.status(500).json({ error: "تعذر الاتصال بالخادم. حاول لاحقًا." });
  }
});

/** Profil du compte connecté (vérifie que la session est toujours valide). */
router.get("/me", requireRapportAuth, async (req: Request, res: Response) => {
  noStore(res);
  const authConfig = getAuthConfig();
  if (!authConfig) {
    return res.status(503).json({ error: "Connexion non configurée sur le serveur." });
  }

  try {
    return res.json({
      user: {
        id: req.rapport_user!.sub,
        firstName: authConfig.firstName,
        lastName: authConfig.lastName,
        role: req.rapport_user!.role,
      },
    });
  } catch (error) {
    console.error("[auth] me:", error);
    return res.status(500).json({ error: "تعذر تحميل الحساب." });
  }
});

export default router;
