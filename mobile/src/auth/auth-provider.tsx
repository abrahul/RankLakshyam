import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { User, AuthState } from "../types/auth";
import { saveSession, getUser, getToken, clearSession } from "./session-storage";
import { API_BASE_URL } from "../utils/config";

interface AuthContextValue extends AuthState {
  login: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // Restore session on mount
  useEffect(() => {
    (async () => {
      try {
        const [token, user] = await Promise.all([getToken(), getUser()]);
        if (token && user) {
          setState({ user, token, isLoading: false, isAuthenticated: true });
        } else {
          setState((prev) => ({ ...prev, isLoading: false }));
        }
      } catch {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    })();
  }, []);

  const login = useCallback(async (idToken: string) => {
    const res = await fetch(`${API_BASE_URL}/api/auth/mobile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });
    const data = await res.json();

    if (!data.success) {
      throw new Error(typeof data.error === "string" ? data.error : data.error?.message || "Login failed");
    }

    const { token, user } = data.data as { token: string; user: User };
    await saveSession(token, user);
    setState({ user, token, isLoading: false, isAuthenticated: true });
  }, []);

  const logout = useCallback(async () => {
    await clearSession();
    setState({ user: null, token: null, isLoading: false, isAuthenticated: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
