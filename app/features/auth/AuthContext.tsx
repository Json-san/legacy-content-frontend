import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  clearToken,
  fetchCurrentUser,
  fetchMyOrganizations,
  getStoredToken,
  login as loginRequest,
  register as registerRequest,
  type CurrentUser,
  type LoginPayload,
  type MyOrganization,
  type RegisterPayload,
} from "./auth.api";

type AuthState = {
  user: CurrentUser | null;
  token: string | null;
  /** The organization the current user is acting in. Single-org per user for now — the first
   * (and, today, only) membership returned by `/users/me/organizations`. */
  organization: MyOrganization | null;
  /** True while the stored token is being validated on first load. */
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

async function loadSession(token: string) {
  const [me, orgs] = await Promise.all([fetchCurrentUser(token), fetchMyOrganizations(token)]);
  return { me, organization: orgs[0] ?? null };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [organization, setOrganization] = useState<MyOrganization | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = getStoredToken();
    if (!stored) {
      setIsLoading(false);
      return;
    }
    loadSession(stored)
      .then(({ me, organization }) => {
        setToken(stored);
        setUser(me);
        setOrganization(organization);
      })
      .catch(() => {
        clearToken();
      })
      .finally(() => setIsLoading(false));
  }, []);

  async function login(payload: LoginPayload) {
    const nextToken = await loginRequest(payload);
    const { me, organization } = await loadSession(nextToken);
    setToken(nextToken);
    setUser(me);
    setOrganization(organization);
  }

  async function register(payload: RegisterPayload) {
    const nextToken = await registerRequest(payload);
    const { me, organization } = await loadSession(nextToken);
    setToken(nextToken);
    setUser(me);
    setOrganization(organization);
  }

  function logout() {
    clearToken();
    setToken(null);
    setUser(null);
    setOrganization(null);
  }

  return (
    <AuthContext.Provider
      value={{ user, token, organization, isLoading, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
