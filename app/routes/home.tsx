import type { Route } from "./+types/home";
import { Hero } from "../hero/Hero";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Legacy Content — Real Estate Compliance Engine" },
    {
      name: "description",
      content:
        "Check your real estate marketing content against your organization's compliance rules before it publishes.",
    },
  ];
}

export default function Home() {
  return <Hero />;
}
