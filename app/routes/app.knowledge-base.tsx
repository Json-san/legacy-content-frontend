import type { Route } from "./+types/app.knowledge-base";

export { default } from "../features/knowledge-base/DocumentsPage";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Knowledge Base — Legacy Content" }];
}
