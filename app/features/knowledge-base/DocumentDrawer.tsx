import { useEffect, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ApiError } from "../../lib/api-client";
import { Drawer } from "../../components/ui/Drawer";
import { Dropdown } from "../../components/ui/Dropdown";
import { Badge, type BadgeTone } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { FileInput } from "../../components/ui/FileInput";
import { stepFade, easeOut } from "../../components/motion/variants";
import {
  createDocument,
  createDocumentVersion,
  getDocument,
  type Document,
  type DocumentDetail,
  type DocumentSourceType,
} from "./documents.api";

export const SOURCE_TYPES: { value: DocumentSourceType; label: string }[] = [
  { value: "UPLOAD", label: "Upload a file" },
  { value: "MANUAL", label: "Enter content manually" },
];

export const SOURCE_TYPE_LABEL = new Map(SOURCE_TYPES.map((t) => [t.value, t.label]));

const VERSION_STATUS_TONE: Record<string, BadgeTone> = {
  PENDING: "status-pending",
  PROCESSING: "status-processing",
  READY: "status-ready",
  FAILED: "status-failed",
};

export function DocumentDrawer({
  organizationId,
  token,
  existing,
  canManage,
  onClose,
  onSaved,
}: {
  organizationId: string;
  token: string;
  existing: Document | null;
  canManage: boolean;
  onClose: () => void;
  onSaved: (documents: Document[]) => void;
}) {
  const isEdit = existing !== null;

  const [name, setName] = useState(existing?.name ?? "");
  const [type, setType] = useState(existing?.type ?? "");
  const [sourceType, setSourceType] = useState<DocumentSourceType>(existing?.source_type ?? "UPLOAD");
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const isBatch = sourceType === "UPLOAD" && files.length > 1;

  // Single-file add-version keeps a separate slot — batch state above is create-only.
  const [versionFile, setVersionFile] = useState<File | null>(null);

  const [detail, setDetail] = useState<DocumentDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [versionSubmitting, setVersionSubmitting] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    setDetailError(null);
    getDocument(organizationId, token, existing.id)
      .then(setDetail)
      .catch((err) =>
        setDetailError(err instanceof ApiError ? err.message : "Couldn't load document versions."),
      );
  }, [isEdit, organizationId, token, existing]);

  function stripExtension(filename: string): string {
    const dot = filename.lastIndexOf(".");
    return dot > 0 ? filename.slice(0, dot) : filename;
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const batch = isBatch
      ? files.map((f) => ({ name: stripExtension(f.name), file: f }))
      : [{ name, file: files[0] }];

    const created: Document[] = [];
    const failed: { name: string; message: string }[] = [];

    for (const item of batch) {
      try {
        const doc = await createDocument(organizationId, token, {
          name: item.name,
          type,
          source_type: sourceType,
          content: sourceType === "MANUAL" ? content : undefined,
          file: sourceType === "UPLOAD" ? item.file : undefined,
        });
        created.push(doc);
      } catch (err) {
        failed.push({
          name: item.name,
          message: err instanceof ApiError ? err.message : "Couldn't create this document.",
        });
      }
    }

    if (created.length > 0) onSaved(created);

    if (failed.length > 0) {
      setError(
        failed.length === batch.length
          ? failed[0].message
          : `${failed.length} of ${batch.length} files failed: ${failed.map((f) => f.name).join(", ")}.`,
      );
      // Keep only what still needs retrying — successes are already in the list.
      setFiles((prev) => prev.filter((f) => failed.some((fl) => fl.name === stripExtension(f.name))));
    } else {
      setSubmitting(false);
      onClose();
      return;
    }

    setSubmitting(false);
  }

  async function handleAddVersion(e: FormEvent) {
    e.preventDefault();
    if (!existing) return;
    setError(null);
    setVersionSubmitting(true);
    try {
      await createDocumentVersion(organizationId, token, existing.id, {
        content: existing.source_type === "MANUAL" ? content : undefined,
        file: existing.source_type === "UPLOAD" && versionFile ? versionFile : undefined,
      });
      const refreshed = await getDocument(organizationId, token, existing.id);
      onSaved([refreshed]);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't add a new version.");
    } finally {
      setVersionSubmitting(false);
    }
  }

  const canCreate =
    type.trim().length > 0 &&
    (sourceType === "MANUAL"
      ? name.trim().length > 0 && content.trim().length > 0
      : files.length > 0 && (isBatch || name.trim().length > 0));

  const canAddVersion = existing
    ? existing.source_type === "MANUAL"
      ? content.trim().length > 0
      : versionFile !== null
    : false;

  return (
    <Drawer onClose={onClose} ariaLabel={isEdit ? "Document" : "New document"}>
      <header className="rules-drawer__header">
        <p className="rules-drawer__eyebrow">{isEdit ? "Document" : "New document"}</p>
        <button type="button" className="rules-drawer__close" onClick={onClose} aria-label="Close">
          ×
        </button>
      </header>

      <AnimatePresence mode="wait">
        <motion.div
          key={isEdit ? "edit" : "new"}
          variants={stepFade}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={easeOut}
        >
          {error && <div className="rules-error">{error}</div>}

          {!isEdit && (
            <form className="rules-drawer__form" onSubmit={handleCreate}>
              <div className="rules-fields">
                <label className="rules-field">
                  <span>Type</span>
                  <input
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    required
                    maxLength={100}
                    placeholder="e.g. Fair Housing Policy"
                  />
                </label>
                <label className="rules-field">
                  <span>Source</span>
                  <Dropdown
                    value={sourceType}
                    onChange={(v) => {
                      setSourceType(v as DocumentSourceType);
                      setContent("");
                      setFiles([]);
                    }}
                    options={SOURCE_TYPES}
                    ariaLabel="Source type"
                  />
                </label>

                {sourceType === "UPLOAD" ? (
                  <label className="rules-field">
                    <span>File{files.length > 1 ? "s" : ""}</span>
                    <FileInput value={files} onChange={setFiles} multiple ariaLabel="Document files" />
                  </label>
                ) : (
                  <label className="rules-field">
                    <span>Content</span>
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      rows={8}
                      required
                      placeholder="Paste or write the document content."
                    />
                  </label>
                )}

                {isBatch ? (
                  <p className="rules-review__note">
                    Each file becomes its own document, named from its filename — all sharing this Type.
                  </p>
                ) : (
                  <label className="rules-field">
                    <span>Name</span>
                    <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={255} />
                  </label>
                )}
              </div>

              <div className="rules-drawer__nav">
                <Button type="submit" disabled={submitting || !canCreate}>
                  {submitting
                    ? isBatch
                      ? `Creating ${files.length}…`
                      : "Creating…"
                    : isBatch
                      ? `Create ${files.length} documents`
                      : "Create document"}
                </Button>
              </div>
            </form>
          )}

          {isEdit && existing && (
            <div className="rules-drawer__form">
              <div className="rules-review">
                <dl>
                  <dt>Name</dt>
                  <dd>{existing.name}</dd>
                  <dt>Type</dt>
                  <dd>{existing.type}</dd>
                  <dt>Source</dt>
                  <dd>{SOURCE_TYPE_LABEL.get(existing.source_type)}</dd>
                  <dt>Status</dt>
                  <dd>{existing.status}</dd>
                </dl>
              </div>

              {detailError && <div className="rules-error">{detailError}</div>}

              {!detailError && !detail && <p className="rules-loading">Loading versions…</p>}

              {detail && (
                <div className="kb-versions">
                  <p className="kb-versions__title">Versions</p>
                  <ul className="kb-versions__list">
                    {detail.versions.map((v) => (
                      <li key={v.id} className="kb-versions__row">
                        <span className="kb-versions__number">v{v.version}</span>
                        <Badge tone={VERSION_STATUS_TONE[v.status] ?? "neutral"}>{v.status}</Badge>
                        <span className="kb-versions__date">
                          {new Date(v.created_at).toLocaleString()}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {canManage && (
                <form className="rules-fields kb-add-version" onSubmit={handleAddVersion}>
                  <p className="kb-versions__title">Add new version</p>
                  {existing.source_type === "UPLOAD" ? (
                    <label className="rules-field">
                      <span>File</span>
                      <FileInput
                        value={versionFile ? [versionFile] : []}
                        onChange={(picked) => setVersionFile(picked[0] ?? null)}
                        ariaLabel="New version file"
                      />
                    </label>
                  ) : (
                    <label className="rules-field">
                      <span>Content</span>
                      <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        rows={6}
                        required
                        placeholder="Paste or write the updated content."
                      />
                    </label>
                  )}

                  <div className="rules-drawer__nav">
                    <Button type="submit" disabled={versionSubmitting || !canAddVersion}>
                      {versionSubmitting ? "Adding…" : "Add version"}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </Drawer>
  );
}
