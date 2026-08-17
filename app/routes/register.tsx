import type { Route } from "./+types/register";

export { default } from "../features/auth/RegisterPage";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Create your organization — Legacy Content" }];
}
