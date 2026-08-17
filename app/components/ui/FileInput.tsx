import { useId, useRef } from "react";
import "./ui.css";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Evident file picker: a dashed dropzone-style trigger + a list of chosen files,
 * each removable — replaces the easy-to-miss native `<input type="file">` chrome. */
export function FileInput({
  value,
  onChange,
  multiple = false,
  accept,
  ariaLabel,
}: {
  value: File[];
  onChange: (files: File[]) => void;
  multiple?: boolean;
  accept?: string;
  ariaLabel: string;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length === 0) return;
    onChange(multiple ? [...value, ...picked] : [picked[0]]);
    if (inputRef.current) inputRef.current.value = "";
  }

  function removeAt(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div className="file-input">
      <input
        ref={inputRef}
        id={inputId}
        className="file-input__native"
        type="file"
        multiple={multiple}
        accept={accept}
        aria-label={ariaLabel}
        onChange={handlePick}
      />
      <label htmlFor={inputId} className="file-input__trigger">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 4v11m0-11 4 4m-4-4-4 4" />
          <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
        </svg>
        <span>
          {value.length === 0
            ? multiple
              ? "Choose files, or drop them here"
              : "Choose a file, or drop it here"
            : multiple
              ? "Add more files"
              : "Replace file"}
        </span>
      </label>

      {value.length > 0 && (
        <ul className="file-input__list">
          {value.map((file, i) => (
            <li key={`${file.name}-${i}`} className="file-input__item">
              <span className="file-input__item-name">{file.name}</span>
              <span className="file-input__item-size">{formatSize(file.size)}</span>
              <button
                type="button"
                className="file-input__item-remove"
                aria-label={`Remove ${file.name}`}
                onClick={() => removeAt(i)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
