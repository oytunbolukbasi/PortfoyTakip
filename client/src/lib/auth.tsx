import { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface AuthState {
  authenticated: boolean;
  username: string | null;
  loading: boolean;
}

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    authenticated: false,
    username: null,
    loading: true,
  });

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        setState({ authenticated: data.authenticated, username: data.username ?? null, loading: false });
      })
      .catch(() => setState({ authenticated: false, username: null, loading: false }));
  }, []);

  const login = async (username: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      setState({ authenticated: true, username: data.username, loading: false });
      return { success: true };
    }
    return { success: false, error: data.error || "Giriş başarısız" };
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setState({ authenticated: false, username: null, loading: false });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
