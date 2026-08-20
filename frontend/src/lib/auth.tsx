import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { setAccessToken, setRefreshToken } from "@/api/adapter";

type AuthState =
  | { status: "checking" }
  | { status: "ready"; username: string }
  | { status: "error"; message: string };

type AuthContextValue = {
  authState: AuthState;
  retryLogin: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({ status: "checking" });

  const retryLogin = () => {
    setAuthState({ status: "checking" });
  };

  useEffect(() => {
    if (authState.status !== "checking") return;

    const login = async () => {
      try {
        const response = await fetch("/api/v1/auth/demo-session", { method: "POST", credentials: "include" });
        if (!response.ok) {
          throw new Error(`خطای لاگین (${response.status})`);
        }
        const body = (await response.json()) as {
          access_token?: string;
          refresh_token?: string;
          username?: string;
        };
        if (body.access_token) setAccessToken(body.access_token);
        if (body.refresh_token) setRefreshToken(body.refresh_token);
        setAuthState({ status: "ready", username: body.username ?? "demo" });
      } catch (error) {
        setAuthState({
          status: "error",
          message: error instanceof Error ? error.message : "اتصال به Backend برقرار نشد",
        });
      }
    };
    void login();
  }, [authState.status]);

  return <AuthContext.Provider value={{ authState, retryLogin }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error("useAuth باید درون AuthProvider استفاده شود.");
  }
  return context;
}