import { useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../auth/AuthContext";
import { AppShell } from "../../components/layout/AppShell";
import { Badge } from "../../components/ui/Badge";

const modules = [
  {
    title: "Compliance Checks",
    desc: "Submit listing copy and see it checked against your organization's rules in real time.",
    tag: "Coming next",
    disabled: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 12.5 11.5 15 16 9" />
        <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
      </svg>
    ),
  },
  {
    title: "Rules",
    desc: "Prohibited phrases, required disclosures, formatting — the rules every check runs against.",
    tag: "Manage rules",
    disabled: false,
    href: "/app/rules",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 4h9l4 4v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />
        <path d="M9 12h6M9 16h6" />
      </svg>
    ),
  },
  {
    title: "Knowledge Base",
    desc: "Upload documents so the semantic engine can ground findings in your own material.",
    tag: "Not built yet",
    disabled: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 6.5C4 5.1 7 4 12 4s8 1.1 8 2.5-3 2.5-8 2.5-8-1.1-8-2.5Z" />
        <path d="M4 6.5V17c0 1.4 3 2.5 8 2.5s8-1.1 8-2.5V6.5" />
        <path d="M4 11.8c0 1.4 3 2.5 8 2.5s8-1.1 8-2.5" />
      </svg>
    ),
  },
  {
    title: "Reports",
    desc: "Compliance history across your organization, filterable by status, risk and channel.",
    tag: "Not built yet",
    disabled: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 20V10M12 20V4M19 20v-7" />
      </svg>
    ),
  },
];

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !user) navigate("/login", { replace: true });
  }, [isLoading, user, navigate]);

  if (isLoading || !user) return null;

  return (
    <AppShell>
      <main className="page">
        <p className="page__eyebrow">
          <span>Overview</span>
        </p>
        <h1 className="page__title">Welcome back, {user.name.split(" ")[0]}</h1>
        <p className="page__lede">
          This is where compliance checking will live. The auth layer is wired up — everything
          below is what gets built next.
        </p>

        <div className="card-grid">
          {modules.map((m) =>
            m.href ? (
              <Link key={m.title} to={m.href} className="card">
                <span className="card__icon">{m.icon}</span>
                <span className="card__title">{m.title}</span>
                <span className="card__desc">{m.desc}</span>
                <Badge tone="neutral">{m.tag}</Badge>
              </Link>
            ) : (
              <div key={m.title} className="card card--disabled">
                <span className="card__icon">{m.icon}</span>
                <span className="card__title">{m.title}</span>
                <span className="card__desc">{m.desc}</span>
                <Badge tone="neutral">{m.tag}</Badge>
              </div>
            ),
          )}
        </div>
      </main>
    </AppShell>
  );
}
