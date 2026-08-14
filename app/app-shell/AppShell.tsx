import type { ReactNode } from "react";
import { Link } from "react-router";
import { useAuth } from "../lib/AuthContext";
import "./app-shell.css";

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();

  return (
    <div className="shell">
      <header className="nav">
        <Link className="brand" to="/app">
          <svg
            className="brand__mark"
            viewBox="0 0 48 48"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10 24 24 12l14 12" />
            <path d="M13 21v15h9V26h4v10h9V21" />
            <path d="M20 26h8" />
            <path d="M29 15v-4h5v7" />
          </svg>
          <span className="brand__text">
            <span className="brand__name">Legacy Content</span>
            <span className="brand__tagline">Real Estate Compliance Engine</span>
          </span>
        </Link>

        <nav className="nav__links" aria-label="Main">
          <Link to="/app" className="is-active" aria-current="page">
            Overview
          </Link>
          <span>Rules</span>
          <span>Compliance Checks</span>
          <span>Knowledge Base</span>
          <span>Reports</span>
        </nav>

        <div className="nav__account">
          {user && (
            <span className="nav__account-name">
              <strong>{user.name}</strong>
              <span>{user.email}</span>
            </span>
          )}
          <button className="nav__signout" onClick={logout}>
            Sign out
          </button>
        </div>
      </header>

      {children}
    </div>
  );
}
