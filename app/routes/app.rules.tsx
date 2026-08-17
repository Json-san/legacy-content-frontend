import type { Route } from "./+types/app.rules";

export { default } from "../features/rules/RulesPage";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Rules — Legacy Content" }];
}
