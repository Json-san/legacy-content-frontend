import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "../auth/AuthContext";
import { ApiError } from "../../lib/api-client";
import { listRules, disableRule, updateRule, type Rule, type RuleType } from "./rules.api";
import { AppShell } from "../../components/layout/AppShell";
import { Dropdown } from "../../components/ui/Dropdown";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { listItem } from "../../components/motion/variants";
import { RuleDrawer, RULE_TYPES, RULE_TYPE_LABEL } from "./RuleDrawer";
import "./app-rules.css";

const MANAGE_ROLES = new Set(["OWNER", "ADMIN"]);

const PAGE_SIZE = 20;

const TYPE_FILTER_OPTIONS = [
  { value: "ALL", label: "All types" },
  ...RULE_TYPES.map((t) => ({ value: t.value, label: t.label })),
];

const STATUS_FILTER_OPTIONS = [
  { value: "ALL", label: "All statuses" },
  { value: "ENABLED", label: "Active only" },
  { value: "DISABLED", label: "Disabled only" },
];

export default function RulesPage() {
  const { user, organization, token, isLoading } = useAuth();
  const navigate = useNavigate();

  const [rules, setRules] = useState<Rule[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<RuleType | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ENABLED" | "DISABLED">("ALL");

  const [drawerRule, setDrawerRule] = useState<Rule | "new" | null>(null);
  const [confirmingDisable, setConfirmingDisable] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const canManage = organization ? MANAGE_ROLES.has(organization.role) : false;

  useEffect(() => {
    if (!isLoading && !user) navigate("/login", { replace: true });
  }, [isLoading, user, navigate]);

  useEffect(() => {
    if (!token || !organization) return;
    setLoadError(null);
    listRules(organization.id, token)
      .then(setRules)
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "Couldn't load rules."));
  }, [token, organization, reloadToken]);

  const filtered = useMemo(() => {
    if (!rules) return [];
    return rules.filter((r) => {
      if (typeFilter !== "ALL" && r.type !== typeFilter) return false;
      if (statusFilter === "ENABLED" && !r.enabled) return false;
      if (statusFilter === "DISABLED" && r.enabled) return false;
      if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [rules, typeFilter, statusFilter, search]);

  useEffect(() => {
    setPage(1);
  }, [typeFilter, statusFilter, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function upsertLocal(rule: Rule) {
    setRules((prev) => {
      if (!prev) return [rule];
      const exists = prev.some((r) => r.id === rule.id);
      return exists ? prev.map((r) => (r.id === rule.id ? rule : r)) : [rule, ...prev];
    });
  }

  async function handleDisable(rule: Rule) {
    if (!token || !organization) return;
    const updated = await disableRule(organization.id, token, rule.id);
    upsertLocal(updated);
    setConfirmingDisable(null);
  }

  async function handleEnable(rule: Rule) {
    if (!token || !organization) return;
    const updated = await updateRule(organization.id, token, rule.id, { enabled: true });
    upsertLocal(updated);
  }

  if (isLoading || !user) return null;

  return (
    <AppShell>
      <main className="page rules-page">
        <p className="page__eyebrow">
          <span>Rules</span>
        </p>
        <h1 className="page__title">What your AI-generated content is held to</h1>
        <p className="page__lede">
          Every compliance check runs against the rules enabled here. Add a rule for anything
          your team needs to catch automatically — a banned phrase, a required disclosure, a
          length limit — before it ever reaches a listing.
        </p>

        {!canManage && organization && (
          <p className="rules-readonly-note">
            You have {organization.role.toLowerCase()} access — rules are read-only for you.
            Ask an owner or admin to make changes.
          </p>
        )}

        <div className="rules-toolbar">
          <input
            className="rules-search"
            type="search"
            placeholder="Search rules…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search rules"
          />

          <Dropdown
            value={typeFilter}
            onChange={(v) => setTypeFilter(v as RuleType | "ALL")}
            options={TYPE_FILTER_OPTIONS}
            ariaLabel="Filter by type"
          />

          <Dropdown
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as typeof statusFilter)}
            options={STATUS_FILTER_OPTIONS}
            ariaLabel="Filter by status"
          />

          {canManage && (
            <Button type="button" className="rules-new-btn" onClick={() => setDrawerRule("new")}>
              New rule
            </Button>
          )}
        </div>

        {loadError && (
          <div className="rules-error">
            {loadError}{" "}
            <Button type="button" variant="ghost" shape="pill" onClick={() => setReloadToken((n) => n + 1)}>
              Retry
            </Button>
          </div>
        )}

        {rules === null && !loadError && <p className="rules-loading">Loading rules…</p>}

        {rules !== null && rules.length === 0 && (
          <div className="rules-empty">
            <p className="rules-empty__title">No rules yet</p>
            <p className="rules-empty__desc">
              This organization has nothing to check content against. Start with one rule — a
              phrase you never want AI copy to use is usually the fastest place to begin.
            </p>
            {canManage && (
              <Button type="button" className="rules-new-btn" onClick={() => setDrawerRule("new")}>
                Create your first rule
              </Button>
            )}
          </div>
        )}

        {rules !== null && rules.length > 0 && filtered.length === 0 && (
          <p className="rules-empty__desc">No rules match these filters.</p>
        )}

        {filtered.length > 0 && (
          <ul className="rules-list">
            <AnimatePresence initial={false}>
              {paged.map((rule) => (
                <motion.li
                  key={rule.id}
                  className="rules-row"
                  data-enabled={rule.enabled}
                  layout
                  variants={listItem}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
                  <div className="rules-row__main">
                    <div className="rules-row__heading">
                      <Badge
                        tone={`severity-${rule.severity.toLowerCase()}` as
                          | "severity-low"
                          | "severity-medium"
                          | "severity-high"
                          | "severity-critical"}
                        ariaLabel={`Severity: ${rule.severity}`}
                        title={`Severity: ${rule.severity}`}
                      />
                      <span className="rules-row__name">{rule.name}</span>
                      <span className="rules-row__version">v{rule.version}</span>
                      <AnimatePresence>
                        {!rule.enabled && (
                          <Badge tone="disabled" animated>
                            Disabled
                          </Badge>
                        )}
                      </AnimatePresence>
                    </div>
                    {rule.description && <p className="rules-row__desc">{rule.description}</p>}
                    <span className="rules-row__type">{RULE_TYPE_LABEL.get(rule.type)}</span>
                  </div>

                  {canManage && (
                    <div className="rules-row__actions">
                      <Button
                        type="button"
                        variant="ghost"
                        shape="pill"
                        className="rules-row__action"
                        onClick={() => setDrawerRule(rule)}
                      >
                        Edit
                      </Button>
                      {rule.enabled ? (
                        confirmingDisable === rule.id ? (
                          <Button
                            type="button"
                            variant="ghost"
                            shape="pill"
                            className="rules-row__action rules-row__action--confirm"
                            onClick={() => handleDisable(rule)}
                          >
                            Confirm disable
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="ghost"
                            shape="pill"
                            className="rules-row__action"
                            onClick={() => setConfirmingDisable(rule.id)}
                          >
                            Disable
                          </Button>
                        )
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          shape="pill"
                          className="rules-row__action"
                          onClick={() => handleEnable(rule)}
                        >
                          Enable
                        </Button>
                      )}
                    </div>
                  )}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}

        {pageCount > 1 && (
          <div className="rules-pagination">
            <Button
              type="button"
              variant="ghost"
              shape="pill"
              className="rules-row__action"
              disabled={currentPage === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <span className="rules-pagination__status">
              Page {currentPage} of {pageCount}
            </span>
            <Button
              type="button"
              variant="ghost"
              shape="pill"
              className="rules-row__action"
              disabled={currentPage === pageCount}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </main>

      <AnimatePresence>
        {drawerRule !== null && organization && token && (
          <RuleDrawer
            organizationId={organization.id}
            token={token}
            existing={drawerRule === "new" ? null : drawerRule}
            onClose={() => setDrawerRule(null)}
            onSaved={(rule) => {
              upsertLocal(rule);
              setDrawerRule(null);
            }}
          />
        )}
      </AnimatePresence>
    </AppShell>
  );
}
