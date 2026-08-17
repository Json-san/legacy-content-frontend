import { useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ApiError } from "../../lib/api-client";
import { Drawer } from "../../components/ui/Drawer";
import { Dropdown } from "../../components/ui/Dropdown";
import { Button } from "../../components/ui/Button";
import { stepFade, easeOut } from "../../components/motion/variants";
import {
  createRule,
  updateRule,
  type Rule,
  type RuleCreatePayload,
  type RuleType,
  type Severity,
} from "./rules.api";
import {
  ConfigFields,
  defaultConfigFor,
  draftFromServerConfig,
  serverConfigFromDraft,
  type ConfigDraft,
} from "./ConfigFields";

export type RuleTypeInfo = { value: RuleType; label: string; hint: string };

export const RULE_TYPES: RuleTypeInfo[] = [
  { value: "PROHIBITED_PHRASE", label: "Prohibited phrase", hint: "Flags content that contains any of a list of banned phrases." },
  { value: "REQUIRED_PHRASE", label: "Required phrase", hint: "Flags content missing at least one phrase from a list." },
  { value: "REQUIRED_DISCLOSURE", label: "Required disclosure", hint: "Same as required phrase, scoped to legal disclosures." },
  { value: "MAX_LENGTH", label: "Max length", hint: "Flags content longer than a character limit." },
  { value: "MIN_LENGTH", label: "Min length", hint: "Flags content shorter than a character minimum." },
  { value: "REGEX", label: "Regex pattern", hint: "Flags content that matches — or fails to match — a pattern." },
  { value: "KEYWORD", label: "Keyword", hint: "Flags content that contains any of a list of keywords." },
  { value: "FORMATTING", label: "Formatting", hint: "Flags excessive exclamation marks or all-caps words." },
  { value: "SEMANTIC", label: "Semantic (AI-reviewed)", hint: "Guidance handed to the LLM engine — not checked deterministically." },
];

export const RULE_TYPE_LABEL = new Map(RULE_TYPES.map((t) => [t.value, t.label]));

const SEVERITIES: Severity[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const SEVERITY_OPTIONS = SEVERITIES.map((s) => ({ value: s, label: s }));

export function RuleDrawer({
  organizationId,
  token,
  existing,
  onClose,
  onSaved,
}: {
  organizationId: string;
  token: string;
  existing: Rule | null;
  onClose: () => void;
  onSaved: (rule: Rule) => void;
}) {
  const isEdit = existing !== null;
  // Editing skips the type pick — the backend treats `type` as immutable identity.
  const [step, setStep] = useState<1 | 2 | 3>(isEdit ? 2 : 1);
  const [type, setType] = useState<RuleType>(existing?.type ?? "PROHIBITED_PHRASE");
  const [name, setName] = useState(existing?.name ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [severity, setSeverity] = useState<Severity>(existing?.severity ?? "MEDIUM");
  const [enabled, setEnabled] = useState(existing?.enabled ?? true);
  const [config, setConfig] = useState<ConfigDraft>(
    existing ? draftFromServerConfig(existing.type, existing.configuration) : defaultConfigFor(type),
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function selectType(next: RuleType) {
    setType(next);
    setConfig(defaultConfigFor(next));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (isEdit) {
        const updated = await updateRule(organizationId, token, existing.id, {
          name,
          description,
          severity,
          enabled,
          configuration: serverConfigFromDraft(type, config),
        });
        onSaved(updated);
      } else {
        const payload: RuleCreatePayload = {
          name,
          description,
          type,
          severity,
          enabled,
          configuration: serverConfigFromDraft(type, config),
        };
        const created = await createRule(organizationId, token, payload);
        onSaved(created);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save this rule.");
    } finally {
      setSubmitting(false);
    }
  }

  const canGoToStep2 = name.trim().length > 0;

  return (
    <Drawer onClose={onClose} ariaLabel={isEdit ? "Edit rule" : "New rule"}>
      <header className="rules-drawer__header">
        <p className="rules-drawer__eyebrow">{isEdit ? "Editing" : "New rule"}</p>
        <button type="button" className="rules-drawer__close" onClick={onClose} aria-label="Close">
          ×
        </button>
      </header>

      <ol className="rules-steps" aria-label="Progress">
        {!isEdit && (
          <li className={step === 1 ? "is-current" : step > 1 ? "is-done" : ""}>1. Type</li>
        )}
        <li className={step === 2 ? "is-current" : step > 2 ? "is-done" : ""}>
          {isEdit ? "1. Configure" : "2. Configure"}
        </li>
        <li className={step === 3 ? "is-current" : ""}>{isEdit ? "2. Review" : "3. Review"}</li>
      </ol>

      <form className="rules-drawer__form" onSubmit={step === 3 ? handleSubmit : (e) => e.preventDefault()}>
        {error && <div className="rules-error">{error}</div>}

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            variants={stepFade}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={easeOut}
          >
            {step === 1 && !isEdit && (
              <div className="rules-type-grid">
                {RULE_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    className={`rules-type-card ${type === t.value ? "is-selected" : ""}`}
                    onClick={() => selectType(t.value)}
                  >
                    <span className="rules-type-card__label">{t.label}</span>
                    <span className="rules-type-card__hint">{t.hint}</span>
                  </button>
                ))}
              </div>
            )}

            {step === 2 && (
              <div className="rules-fields">
                <label className="rules-field">
                  <span>Name</span>
                  <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={255} />
                </label>
                <label className="rules-field">
                  <span>Description</span>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    placeholder="What this rule is for, in one line."
                  />
                </label>
                <label className="rules-field">
                  <span>Severity</span>
                  <Dropdown
                    value={severity}
                    onChange={(v) => setSeverity(v as Severity)}
                    options={SEVERITY_OPTIONS}
                    ariaLabel="Severity"
                  />
                </label>

                <ConfigFields type={type} config={config} onChange={setConfig} />

                <label className="rules-field rules-field--inline">
                  <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
                  <span>Enabled — this rule runs on new compliance checks immediately</span>
                </label>
              </div>
            )}

            {step === 3 && (
              <div className="rules-review">
                <dl>
                  <dt>Name</dt>
                  <dd>{name}</dd>
                  <dt>Type</dt>
                  <dd>{RULE_TYPE_LABEL.get(type)}</dd>
                  <dt>Severity</dt>
                  <dd>{severity}</dd>
                  <dt>Status</dt>
                  <dd>{enabled ? "Enabled" : "Disabled"}</dd>
                </dl>
                {type === "SEMANTIC" && (
                  <p className="rules-review__note">
                    Semantic rules are stored and handed to the AI review engine — they are not
                    checked deterministically.
                  </p>
                )}
                {isEdit && (
                  <p className="rules-review__note">
                    Saving bumps this rule to version {existing.version + 1}. Past compliance
                    reports keep referencing version {existing.version}, unchanged.
                  </p>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="rules-drawer__nav">
          {step > (isEdit ? 2 : 1) && (
            <Button
              type="button"
              variant="ghost"
              className="rules-drawer__back"
              onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
            >
              Back
            </Button>
          )}
          {step < 3 && (
            <Button
              type="button"
              disabled={step === 2 && !canGoToStep2}
              onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}
            >
              Continue
            </Button>
          )}
          {step === 3 && (
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : isEdit ? "Save changes" : "Create rule"}
            </Button>
          )}
        </div>
      </form>
    </Drawer>
  );
}
