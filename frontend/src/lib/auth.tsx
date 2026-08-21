import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getAuthSession, restoreStoredTokens, setAccessToken, setRefreshToken, updateAccount } from "@/api/adapter";

type AuthState =
  | { status: "signed-out" }
  | { status: "signing-in" }
  | { status: "signing-out"; username: string; isSuperuser: boolean }
  | { status: "ready"; username: string; isSuperuser: boolean }
  | { status: "error"; message: string };

type AuthContextValue = {
  authState: AuthState;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  updateCredentials: (currentPassword: string, username: string, newPassword?: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>(() => {
    const username = sessionStorage.getItem("dashboard_username");
    const isSuperuser = sessionStorage.getItem("dashboard_is_superuser") === "true";
    return username && restoreStoredTokens()
      ? { status: "ready", username, isSuperuser }
      : { status: "signed-out" };
  });

  useEffect(() => {
    if (authState.status !== "ready") return;
    let cancelled = false;
    void getAuthSession()
      .then((session) => {
        if (cancelled) return;
        sessionStorage.setItem("dashboard_username", session.username);
        sessionStorage.setItem("dashboard_is_superuser", String(session.is_superuser));
        setAuthState({
          status: "ready",
          username: session.username,
          isSuperuser: session.is_superuser,
        });
      })
      .catch(() => {
        // خطای موقت همگام‌سازی نباید نشست معتبر محلی را خارج کند.
      });
    return () => { cancelled = true; };
  }, [authState.status]);

  const login = async (username: string, password: string): Promise<boolean> => {
    setAuthState({ status: "signing-in" });
      try {
        const response = await fetch("/api/v1/auth/login", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }), credentials: "include",
        });
        if (!response.ok) {
          throw new Error(response.status === 401 ? "نام کاربری یا رمز عبور درست نیست." : "ورود به سامانه انجام نشد. دوباره تلاش کنید.");
        }
        const body = (await response.json()) as { access_token?: string; refresh_token?: string; is_superuser?: boolean };
        if (!body.access_token || !body.refresh_token) throw new Error("پاسخ سرویس ورود معتبر نیست.");
        setAccessToken(body.access_token);
        setRefreshToken(body.refresh_token);
        sessionStorage.setItem("dashboard_username", username);
        sessionStorage.setItem("dashboard_is_superuser", String(Boolean(body.is_superuser)));
        setAuthState({ status: "ready", username, isSuperuser: Boolean(body.is_superuser) });
        return true;
      } catch (error) {
        setAuthState({
          status: "error",
          message: error instanceof Error ? error.message : "اتصال به سرویس برقرار نشد.",
        });
        return false;
      }
  };

  const logout = async (): Promise<void> => {
    const username = authState.status === "ready" ? authState.username : "";
    const isSuperuser = authState.status === "ready" ? authState.isSuperuser : false;
    const storedRefreshToken = sessionStorage.getItem("dashboard_refresh_token");
    setAuthState({ status: "signing-out", username, isSuperuser });
    try {
      if (storedRefreshToken) {
        await fetch("/api/v1/auth/logout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: storedRefreshToken }),
          credentials: "include",
        });
      }
    } finally {
      // خروج محلی حتی در صورت قطعی شبکه باید قطعی و قابل پیش‌بینی باشد.
      setAccessToken(null);
      setRefreshToken(null);
      sessionStorage.removeItem("dashboard_username");
      sessionStorage.removeItem("dashboard_is_superuser");
      setAuthState({ status: "signed-out" });
    }
  };

  const updateCredentials = async (currentPassword: string, username: string, newPassword?: string): Promise<void> => {
    const session = await updateAccount({ currentPassword, username, newPassword });
    sessionStorage.setItem("dashboard_username", session.username);
    sessionStorage.setItem("dashboard_is_superuser", String(session.is_superuser));
    setAuthState({ status: "ready", username: session.username, isSuperuser: session.is_superuser });
  };

  return <AuthContext.Provider value={{ authState, login, logout, updateCredentials }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error("useAuth باید درون AuthProvider استفاده شود.");
  }
  return context;
}
