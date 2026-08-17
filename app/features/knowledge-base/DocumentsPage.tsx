import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "../auth/AuthContext";
import { ApiError } from "../../lib/api-client";
import {
  listDocuments,
  deleteDocument,
  type Document,
  type DocumentSourceType,
  type DocumentStatus,
} from "./documents.api";
import { AppShell } from "../../components/layout/AppShell";
import { Dropdown } from "../../components/ui/Dropdown";
import { Badge, type BadgeTone } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { listItem } from "../../components/motion/variants";
import { DocumentDrawer, SOURCE_TYPES, SOURCE_TYPE_LABEL } from "./DocumentDrawer";
import "./knowledge-base.css";

const MANAGE_ROLES = new Set(["OWNER", "ADMIN"]);

const PAGE_SIZE = 20;

/** Keeps the grid reading as a grid even with few (or zero) documents, instead of a couple
 * of lonely cards floating in blank page space. */
const MIN_GRID_SLOTS = 8;

const SOURCE_FILTER_OPTIONS = [
  { value: "ALL", label: "All sources" },
  ...SOURCE_TYPES.map((t) => ({ value: t.value, label: t.label })),
];

const STATUSES: DocumentStatus[] = ["PENDING", "PROCESSING", "READY", "FAILED", "ARCHIVED"];

const STATUS_FILTER_OPTIONS = [
  { value: "ALL", label: "All statuses" },
  ...STATUSES.map((s) => ({ value: s, label: s })),
];

const STATUS_TONE: Record<DocumentStatus, BadgeTone> = {
  PENDING: "status-pending",
  PROCESSING: "status-processing",
  READY: "status-ready",
  FAILED: "status-failed",
  ARCHIVED: "status-archived",
};

export default function DocumentsPage() {
  const { user, organization, token, isLoading } = useAuth();
  const navigate = useNavigate();

  const [documents, setDocuments] = useState<Document[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<DocumentSourceType | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | "ALL">("ALL");

  const [drawerTarget, setDrawerTarget] = useState<Document | "new" | null>(null);
  const [viewingSummary, setViewingSummary] = useState<Document | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const canManage = organization ? MANAGE_ROLES.has(organization.role) : false;

  useEffect(() => {
    if (!isLoading && !user) navigate("/login", { replace: true });
  }, [isLoading, user, navigate]);

  useEffect(() => {
    if (!token || !organization) return;
    setLoadError(null);
    listDocuments(organization.id, token)
      .then(setDocuments)
      .catch((err) =>
        setLoadError(err instanceof ApiError ? err.message : "Couldn't load documents."),
      );
  }, [token, organization, reloadToken]);

  const filtered = useMemo(() => {
    if (!documents) return [];
    return documents.filter((d) => {
      if (sourceFilter !== "ALL" && d.source_type !== sourceFilter) return false;
      if (statusFilter !== "ALL" && d.status !== statusFilter) return false;
      if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [documents, sourceFilter, statusFilter, search]);

  useEffect(() => {
    setPage(1);
  }, [sourceFilter, statusFilter, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function upsertLocal(document: Document) {
    setDocuments((prev) => {
      if (!prev) return [document];
      const exists = prev.some((d) => d.id === document.id);
      return exists ? prev.map((d) => (d.id === document.id ? document : d)) : [document, ...prev];
    });
  }

  function upsertManyLocal(created: Document[]) {
    created.forEach(upsertLocal);
  }

  async function handleDelete(document: Document) {
    if (!token || !organization) return;
    setDeleteError(null);
    setDeleting(document.id);
    try {
      await deleteDocument(organization.id, token, document.id);
      setDocuments((prev) => prev?.filter((d) => d.id !== document.id) ?? prev);
      setConfirmingDelete(null);
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : "Couldn't delete this document.");
    } finally {
      setDeleting(null);
    }
  }

  if (isLoading || !user) return null;

  return (
    <AppShell>
      <main className="page kb-page">
        <p className="page__eyebrow">
          <span>Knowledge Base</span>
        </p>
        <h1 className="page__title">What your AI-generated content is grounded in</h1>
        <p className="page__lede">
          Documents uploaded or entered here feed the compliance engine's context — policies,
          disclosures, listing guidance. Add anything your team needs the AI to know about.
        </p>

        {!canManage && organization && (
          <p className="rules-readonly-note">
            You have {organization.role.toLowerCase()} access — the knowledge base is read-only
            for you. Ask an owner or admin to make changes.
          </p>
        )}

        <div className="rules-toolbar">
          <input
            className="rules-search"
            type="search"
            placeholder="Search documents…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search documents"
          />

          <Dropdown
            value={sourceFilter}
            onChange={(v) => setSourceFilter(v as DocumentSourceType | "ALL")}
            options={SOURCE_FILTER_OPTIONS}
            ariaLabel="Filter by source"
          />

          <Dropdown
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as DocumentStatus | "ALL")}
            options={STATUS_FILTER_OPTIONS}
            ariaLabel="Filter by status"
          />

          {canManage && (
            <Button type="button" className="rules-new-btn" onClick={() => setDrawerTarget("new")}>
              New document
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

        {documents === null && !loadError && <p className="rules-loading">Loading documents…</p>}

        {documents !== null && documents.length === 0 && (
          <div className="rules-empty">
            <p className="rules-empty__title">No documents yet</p>
            <p className="rules-empty__desc">
              This organization's knowledge base is empty. Upload a file or enter content manually
              to give the compliance engine something to ground its checks in.
            </p>
            {canManage && (
              <Button type="button" className="rules-new-btn" onClick={() => setDrawerTarget("new")}>
                Add your first document
              </Button>
            )}
          </div>
        )}

        {documents !== null && documents.length > 0 && filtered.length === 0 && (
          <p className="rules-empty__desc">No documents match these filters.</p>
        )}

        {documents !== null && (
          <ul className="kb-grid">
            <AnimatePresence initial={false}>
              {paged.map((document) => (
                <motion.li
                  key={document.id}
                  className="kb-card"
                  layout
                  variants={listItem}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
                  <div className="kb-card__top">
                    <Badge tone={STATUS_TONE[document.status]}>{document.status}</Badge>
                  </div>

                  <p className="kb-card__name">{document.name}</p>
                  <p className="kb-card__meta">
                    {document.type} · {SOURCE_TYPE_LABEL.get(document.source_type)}
                  </p>

                  <div className="kb-card__actions">
                    {document.status === "READY" && (
                      <Button
                        type="button"
                        variant="ghost"
                        shape="pill"
                        className="rules-row__action"
                        onClick={() => setViewingSummary(document)}
                      >
                        View
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      shape="pill"
                      className="rules-row__action"
                      onClick={() => setDrawerTarget(document)}
                    >
                      {canManage ? "Manage" : "Details"}
                    </Button>
                    {canManage &&
                      (confirmingDelete === document.id ? (
                        <Button
                          type="button"
                          variant="ghost"
                          shape="pill"
                          className="rules-row__action rules-row__action--confirm"
                          disabled={deleting === document.id}
                          onClick={() => handleDelete(document)}
                        >
                          {deleting === document.id ? "Deleting…" : "Confirm delete"}
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          shape="pill"
                          className="rules-row__action"
                          onClick={() => setConfirmingDelete(document.id)}
                        >
                          Delete
                        </Button>
                      ))}
                  </div>
                  {deleteError && confirmingDelete === document.id && (
                    <p className="kb-card__error">{deleteError}</p>
                  )}
                </motion.li>
              ))}
            </AnimatePresence>

            {Array.from({ length: Math.max(0, MIN_GRID_SLOTS - paged.length) }).map((_, i) => (
              <li key={`empty-${i}`} className="kb-card kb-card--empty" aria-hidden="true">
                <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 4h10l5 5v19H9V4Z" strokeDasharray="2.5 3" />
                  <path d="M19 4v5h5" strokeDasharray="2.5 3" />
                </svg>
              </li>
            ))}
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
        {drawerTarget !== null && organization && token && (
          <DocumentDrawer
            organizationId={organization.id}
            token={token}
            existing={drawerTarget === "new" ? null : drawerTarget}
            canManage={canManage}
            onClose={() => setDrawerTarget(null)}
            onSaved={upsertManyLocal}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewingSummary && (
          <Modal onClose={() => setViewingSummary(null)} ariaLabel={`Summary of ${viewingSummary.name}`}>
            <header className="kb-summary-modal__header">
              <p className="rules-drawer__eyebrow">Summary</p>
              <button
                type="button"
                className="rules-drawer__close"
                onClick={() => setViewingSummary(null)}
                aria-label="Close"
              >
                ×
              </button>
            </header>
            <h2 className="kb-summary-modal__title">{viewingSummary.name}</h2>
            <p className="kb-summary-modal__meta">
              {viewingSummary.type} · {SOURCE_TYPE_LABEL.get(viewingSummary.source_type)}
            </p>
            <p className="kb-summary-modal__text">
              {viewingSummary.summary?.trim()
                ? viewingSummary.summary
                : "No summary available for this document yet."}
            </p>
          </Modal>
        )}
      </AnimatePresence>
    </AppShell>
  );
}
