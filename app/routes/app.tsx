import { useEffect } from "react";
import { useNavigate } from "react-router";
import type { Route } from "./+types/app";
import { useAuth } from "../lib/AuthContext";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Dashboard — Legacy Content" }];
}

export default function AppHome() {
  const { user, isLoading, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !user) navigate("/login", { replace: true });
  }, [isLoading, user, navigate]);

  if (isLoading || !user) return null;

  return (
    <main style={{ maxWidth: 560, margin: "80px auto", padding: "0 20px", fontFamily: "Inter, system-ui, sans-serif" }}>
      <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 500 }}>
        Signed in as {user.name}
      </h1>
      <p style={{ color: "#6f6f6f" }}>{user.email}</p>
      <p style={{ marginTop: 24 }}>
        The compliance check form isn't built yet — this is the placeholder landing spot after
        sign-in.
      </p>
      <button
        onClick={logout}
        style={{
          marginTop: 24,
          padding: "10px 20px",
          borderRadius: 999,
          border: "1px solid rgba(17,17,17,0.13)",
          background: "transparent",
          cursor: "pointer",
        }}
      >
        Sign out
      </button>
    </main>
  );
}
