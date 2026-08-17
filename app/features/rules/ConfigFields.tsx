import type { RuleType } from "./rules.api";

export type ConfigDraft = Record<string, unknown>;

export function defaultConfigFor(type: RuleType): ConfigDraft {
  switch (type) {
    case "PROHIBITED_PHRASE":
      return { phrases: "", case_sensitive: false };
    case "REQUIRED_PHRASE":
    case "REQUIRED_DISCLOSURE":
      return { phrases: "", match_any: true };
    case "MAX_LENGTH":
      return { max_characters: 500 };
    case "MIN_LENGTH":
      return { min_characters: 50 };
    case "REGEX":
      return { pattern: "", should_match: false, case_insensitive: true };
    case "KEYWORD":
      return { keywords: "", case_sensitive: false };
    case "FORMATTING":
      return { max_exclamation_marks: 1, max_all_caps_words: 2 };
    case "SEMANTIC":
      return { guidance: "" };
  }
}

/** Config as stored on the wire uses `phrases`/`keywords` as string[]; the form edits them as
 * one-per-line text. Convert both directions at the form boundary. */
export function draftFromServerConfig(type: RuleType, config: Record<string, unknown>): ConfigDraft {
  const listField = type === "KEYWORD" ? "keywords" : "phrases";
  if (listField in config && Array.isArray(config[listField])) {
    return { ...config, [listField]: (config[listField] as string[]).join("\n") };
  }
  return { ...config };
}

export function serverConfigFromDraft(type: RuleType, draft: ConfigDraft): Record<string, unknown> {
  const listField = type === "KEYWORD" ? "keywords" : "phrases";
  if (listField in draft && typeof draft[listField] === "string") {
    const items = (draft[listField] as string)
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    return { ...draft, [listField]: items };
  }
  return { ...draft };
}

export function ConfigFields({
  type,
  config,
  onChange,
}: {
  type: RuleType;
  config: ConfigDraft;
  onChange: (next: ConfigDraft) => void;
}) {
  function set(key: string, value: unknown) {
    onChange({ ...config, [key]: value });
  }

  switch (type) {
    case "PROHIBITED_PHRASE":
      return (
        <>
          <label className="rules-field">
            <span>Prohibited phrases (one per line)</span>
            <textarea
              rows={4}
              value={(config.phrases as string) ?? ""}
              onChange={(e) => set("phrases", e.target.value)}
              placeholder={"guaranteed to sell\nbest in the city"}
            />
          </label>
          <label className="rules-field rules-field--inline">
            <input
              type="checkbox"
              checked={Boolean(config.case_sensitive)}
              onChange={(e) => set("case_sensitive", e.target.checked)}
            />
            <span>Case-sensitive match</span>
          </label>
        </>
      );
    case "REQUIRED_PHRASE":
    case "REQUIRED_DISCLOSURE":
      return (
        <>
          <label className="rules-field">
            <span>Required phrases (one per line)</span>
            <textarea
              rows={4}
              value={(config.phrases as string) ?? ""}
              onChange={(e) => set("phrases", e.target.value)}
              placeholder={"Equal Housing Opportunity"}
            />
          </label>
          <label className="rules-field rules-field--inline">
            <input
              type="checkbox"
              checked={Boolean(config.match_any)}
              onChange={(e) => set("match_any", e.target.checked)}
            />
            <span>Pass if any one phrase is present (unchecked requires all)</span>
          </label>
        </>
      );
    case "MAX_LENGTH":
      return (
        <label className="rules-field">
          <span>Maximum characters</span>
          <input
            type="number"
            min={1}
            value={(config.max_characters as number) ?? ""}
            onChange={(e) => set("max_characters", Number(e.target.value))}
          />
        </label>
      );
    case "MIN_LENGTH":
      return (
        <label className="rules-field">
          <span>Minimum characters</span>
          <input
            type="number"
            min={1}
            value={(config.min_characters as number) ?? ""}
            onChange={(e) => set("min_characters", Number(e.target.value))}
          />
        </label>
      );
    case "REGEX":
      return (
        <>
          <label className="rules-field">
            <span>Pattern</span>
            <input
              value={(config.pattern as string) ?? ""}
              onChange={(e) => set("pattern", e.target.value)}
              placeholder="\\b\\d{3}-\\d{4}\\b"
            />
          </label>
          <label className="rules-field rules-field--inline">
            <input
              type="checkbox"
              checked={Boolean(config.should_match)}
              onChange={(e) => set("should_match", e.target.checked)}
            />
            <span>Flag when the pattern matches (unchecked flags when it doesn't)</span>
          </label>
          <label className="rules-field rules-field--inline">
            <input
              type="checkbox"
              checked={Boolean(config.case_insensitive)}
              onChange={(e) => set("case_insensitive", e.target.checked)}
            />
            <span>Case-insensitive</span>
          </label>
        </>
      );
    case "KEYWORD":
      return (
        <>
          <label className="rules-field">
            <span>Keywords (one per line)</span>
            <textarea
              rows={4}
              value={(config.keywords as string) ?? ""}
              onChange={(e) => set("keywords", e.target.value)}
            />
          </label>
          <label className="rules-field rules-field--inline">
            <input
              type="checkbox"
              checked={Boolean(config.case_sensitive)}
              onChange={(e) => set("case_sensitive", e.target.checked)}
            />
            <span>Case-sensitive match</span>
          </label>
        </>
      );
    case "FORMATTING":
      return (
        <>
          <label className="rules-field">
            <span>Max exclamation marks</span>
            <input
              type="number"
              min={0}
              value={(config.max_exclamation_marks as number) ?? ""}
              onChange={(e) => set("max_exclamation_marks", e.target.value === "" ? null : Number(e.target.value))}
            />
          </label>
          <label className="rules-field">
            <span>Max all-caps words</span>
            <input
              type="number"
              min={0}
              value={(config.max_all_caps_words as number) ?? ""}
              onChange={(e) => set("max_all_caps_words", e.target.value === "" ? null : Number(e.target.value))}
            />
          </label>
        </>
      );
    case "SEMANTIC":
      return (
        <label className="rules-field">
          <span>Guidance for the AI reviewer</span>
          <textarea
            rows={4}
            value={(config.guidance as string) ?? ""}
            onChange={(e) => set("guidance", e.target.value)}
            placeholder="Flag any claim about school quality that isn't sourced from an official district rating."
          />
        </label>
      );
  }
}
