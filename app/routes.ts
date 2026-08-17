import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("login", "routes/login.tsx"),
  route("register", "routes/register.tsx"),
  route("app", "routes/app.tsx"),
  route("app/rules", "routes/app.rules.tsx"),
  route("app/knowledge-base", "routes/app.knowledge-base.tsx"),
] satisfies RouteConfig;
