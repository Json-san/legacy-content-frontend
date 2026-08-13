import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  clearToken,
  fetchCurrentUser,
  getStoredToken,
  login as loginRequest,
  register as registerRequest,
  type CurrentUser,
  type LoginPayload,
  type RegisterPayload,
} from "./auth";

type AuthState = {
  user: CurrentUser | null;
  token: string | null;
  /** True while the stored token is being validated on first load. */
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = getStoredToken();
    if (!stored) {
      setIsLoading(false);
      return;
    }
    fetchCurrentUser(stored)
      .then((me) => {
        setToken(stored);
        setUser(me);
      })
      .catch(() => {
        clearToken();
      })
      .finally(() => setIsLoading(false));
  }, []);

  async function login(payload: LoginPayload) {
    const nextToken = await loginRequest(payload);
    const me = await fetchCurrentUser(nextToken);
    setToken(nextToken);
    setUser(me);
  }

  async function register(payload: RegisterPayload) {
    const nextToken = await registerRequest(payload);
    const me = await fetchCurrentUser(nextToken);
    setToken(nextToken);
    setUser(me);
  }

  function logout() {
    clearToken();
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
