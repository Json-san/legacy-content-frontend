import { apiRequest } from "./api-client";

const TOKEN_KEY = "legacy_content_token";

export type RegisterPayload = {
  email: string;
  name: string;
  password: string;
  organization_name: string;
  organization_slug: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

type TokenResponse = { access_token: string; token_type: string };

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  created_at: string;
  updated_at: string;
};

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function storeToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  window.localStorage.removeItem(TOKEN_KEY);
}

export async function login(payload: LoginPayload): Promise<string> {
  const res = await apiRequest<TokenResponse>("/api/v1/auth/login", {
    method: "POST",
    body: payload,
  });
  storeToken(res.access_token);
  return res.access_token;
}

export async function register(payload: RegisterPayload): Promise<string> {
  const res = await apiRequest<TokenResponse & { organization_id: string }>(
    "/api/v1/auth/register",
    { method: "POST", body: payload },
  );
  storeToken(res.access_token);
  return res.access_token;
}

export function fetchCurrentUser(token: string): Promise<CurrentUser> {
  return apiRequest<CurrentUser>("/api/v1/users/me", { token });
}
