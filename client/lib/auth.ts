/**
 * Session du portail Rapports.
 *
 * La connexion est vérifiée par notre serveur à partir des variables
 * d’environnement. Le navigateur ne stocke qu'un jeton JWT signé.
 *
 * Durée de session : 30 jours, conservée dans localStorage (web) et dans la
 * WebView (APK) — la session survit donc à la fermeture de l'application.
 */

const SESSION_KEY = "shm_rapport_session_v3";
const LEGACY_KEYS = ["shm_session_v2", "isLoggedIn", "shm_session_expiry"];

/** URL de l'API : même origine sur le web, URL Netlify explicite dans l'APK. */
export const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

export const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

export interface SessionUser {
  id: string;
  firstName: string;
  lastName: string;
  birthDate?: string;
  role?: string;
}

export interface Credentials {
  firstName: string;
  lastName: string;
  pin: string;
  password: string;
}

interface StoredSession {
  v: 3;
  token: string;
  user: SessionUser;
  issuedAt: number;
  expiresAt: number;
}

function purgeLegacy(): void {
  try {
    for (const key of LEGACY_KEYS) localStorage.removeItem(key);
  } catch {
    // Stockage indisponible : sans effet.
  }
}

function readSession(): StoredSession | null {
  try {
    purgeLegacy();
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredSession>;
    if (
      parsed.v !== 3 ||
      typeof parsed.token !== "string" ||
      !parsed.token ||
      !parsed.user ||
      typeof parsed.expiresAt !== "number"
    ) {
      return null;
    }
    return parsed as StoredSession;
  } catch {
    return null;
  }
}

export interface LoginResult {
  ok: boolean;
  error?: string;
  /** 423 = compte temporairement verrouillé, 429 = trop de tentatives. */
  status?: number;
}

export async function login(credentials: Credentials): Promise<LoginResult> {
  try {
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    });

    const body = (await response.json().catch(() => null)) as
      | { token?: string; user?: SessionUser; expiresInDays?: number; error?: string }
      | null;

    if (!response.ok || !body?.token || !body.user) {
      return {
        ok: false,
        error: body?.error || "تعذر الاتصال بالخادم. تحقق من الشبكة.",
        status: response.status,
      };
    }

    const now = Date.now();
    const days = typeof body.expiresInDays === "number" && body.expiresInDays > 0 ? body.expiresInDays : 30;
    const session: StoredSession = {
      v: 3,
      token: body.token,
      user: body.user,
      issuedAt: now,
      expiresAt: now + days * 24 * 60 * 60 * 1000,
    };

    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    purgeLegacy();
    return { ok: true };
  } catch (error) {
    console.error("[auth] login:", error);
    return { ok: false, error: "تعذر الاتصال بالخادم. تحقق من الشبكة." };
  }
}

export function isSessionValid(): boolean {
  const session = readSession();
  if (!session) return false;
  const now = Date.now();
  if (session.expiresAt <= now || session.expiresAt - now > SESSION_DURATION_MS + 60_000) {
    clearSession();
    return false;
  }
  return true;
}

export function getSessionUser(): SessionUser | null {
  return readSession()?.user ?? null;
}

export function getAuthToken(): string | null {
  return readSession()?.token ?? null;
}

export function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
    purgeLegacy();
  } catch {
    // Ignore storage errors.
  }
}

/**
 * Vérifie la session auprès du serveur (jeton toujours valide, compte actif).
 * En cas de refus, la session locale est effacée. Ne bloque jamais l'affichage
 * si le réseau est absent : on garde alors la session locale jusqu'à expiration.
 */
export async function verifySessionWithServer(): Promise<boolean> {
  if (!isSessionValid()) return false;
  try {
    const response = await fetch(`${API_BASE}/api/auth/me`, { headers: getAuthHeaders() });
    if (response.status === 401 || response.status === 403) {
      clearSession();
      return false;
    }
    if (!response.ok) return true; // serveur indisponible : on ne déconnecte pas
    const body = (await response.json().catch(() => null)) as { user?: SessionUser } | null;
    if (body?.user) {
      const session = readSession();
      if (session) {
        localStorage.setItem(SESSION_KEY, JSON.stringify({ ...session, user: body.user }));
      }
    }
    return true;
  } catch {
    return true; // hors ligne : la session locale reste valide
  }
}
