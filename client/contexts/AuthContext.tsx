import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  isSessionValid,
  clearSession,
  getSessionUser,
  verifySessionWithServer,
  type SessionUser,
} from "@/lib/auth";

interface AuthContextType {
  isAuthenticated: boolean;
  user: SessionUser | null;
  refresh: () => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => isSessionValid());
  const [user, setUser] = useState<SessionUser | null>(() => getSessionUser());

  const refresh = useCallback(() => {
    const valid = isSessionValid();
    setIsAuthenticated(valid);
    setUser(valid ? getSessionUser() : null);
  }, []);

  useEffect(() => {
    // Vérification serveur en arrière-plan : si le compte a été désactivé ou
    // le jeton révoqué, la déconnexion est immédiate. Hors ligne, la session
    // locale reste valide jusqu'à son expiration.
    verifySessionWithServer().then((ok) => {
      setIsAuthenticated(ok);
      setUser(ok ? getSessionUser() : null);
    });

    const id = window.setInterval(refresh, 60_000);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [refresh]);

  const signOut = () => {
    clearSession();
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, refresh, signOut }}>{children}</AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
