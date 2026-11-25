import jwt from "jsonwebtoken";
import type { NextFunction, Request, Response } from "express";

/**
 * Jetons de session du portail Rapports.
 *
 * L'audience est propre à cette application : un jeton émis par le portail
 * des chefs ou par Mon-SHM ne peut pas ouvrir de session ici.
 */
export const RAPPORT_TOKEN_AUDIENCE = "shm-rapports";
export const RAPPORT_SESSION_DAYS = 30;

export interface RapportTokenPayload {
  sub: string;
  role: string;
  aud: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      rapport_user?: RapportTokenPayload;
    }
  }
}

function getSecret(): string | null {
  return process.env.JWT_SECRET || null;
}

export function issueRapportToken(userId: string, role: string): string {
  const secret = getSecret();
  if (!secret) throw new Error("JWT_SECRET is not configured");
  return jwt.sign({ sub: userId, role }, secret, {
    algorithm: "HS256",
    audience: RAPPORT_TOKEN_AUDIENCE,
    issuer: "shm-rapports",
    expiresIn: `${RAPPORT_SESSION_DAYS}d`,
  });
}

export function requireRapportAuth(req: Request, res: Response, next: NextFunction) {
  const secret = getSecret();
  if (!secret) {
    return res.status(503).json({ error: "Connexion non configurée sur le serveur (JWT_SECRET manquant)." });
  }

  const header = req.header("authorization");
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentification requise." });
  }

  try {
    const payload = jwt.verify(header.slice("Bearer ".length).trim(), secret, {
      algorithms: ["HS256"],
      audience: RAPPORT_TOKEN_AUDIENCE,
      issuer: "shm-rapports",
    });

    if (typeof payload !== "object" || typeof (payload as jwt.JwtPayload).sub !== "string") {
      return res.status(401).json({ error: "Jeton invalide." });
    }

    const { sub, role } = payload as unknown as RapportTokenPayload;
    req.rapport_user = { sub, role: role ?? "chef", aud: RAPPORT_TOKEN_AUDIENCE };
    return next();
  } catch {
    return res.status(401).json({ error: "Session expirée ou invalide. Reconnectez-vous." });
  }
}
