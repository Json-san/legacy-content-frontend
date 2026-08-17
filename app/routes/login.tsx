import type { Route } from "./+types/login";

export { default } from "../features/auth/LoginPage";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Sign in — Legacy Content" }];
}
