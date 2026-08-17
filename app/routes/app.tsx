import type { Route } from "./+types/app";

export { default } from "../features/dashboard/DashboardPage";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Dashboard — Legacy Content" }];
}
