/**
 * Limitation de débit en mémoire.
 *
 * Sur Netlify, chaque instance garde son propre compteur : ce n'est pas une
 * protection centralisée, mais elle bloque efficacement les attaques en
 * rafale répétées sur une même instance, sans dépendance externe.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export function getClientIp(req: { headers: Record<string, unknown>; ip?: string }): string {
  const forwarded = req.headers["x-nf-client-connection-ip"] || req.headers["x-forwarded-for"];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  if (typeof raw === "string" && raw.length > 0) return raw.split(",")[0].trim();
  return req.ip || "unknown";
}

export function consume(key: string, windowMs: number, max: number): { allowed: boolean; retryAfterSeconds: number; remaining: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0, remaining: max - 1 };
  }

  bucket.count += 1;
  if (bucket.count > max) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
      remaining: 0,
    };
  }
  return { allowed: true, retryAfterSeconds: 0, remaining: max - bucket.count };
}

// Nettoyage périodique pour éviter que la Map ne grossisse indéfiniment.
if (typeof setInterval === "function") {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  }, 10 * 60_000);
  // Ne bloque pas l'arrêt du processus.
  (timer as unknown as { unref?: () => void }).unref?.();
}
