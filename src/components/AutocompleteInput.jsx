import { useMemo, useRef, useState } from "react";
import { ChevronDown, Clock } from "lucide-react";

/**
 * Text input with a suggestions dropdown.
 * `options`: array of strings, or objects — use `getLabel` / `getSub` to read them.
 * Typing filters; an empty focused input shows the most recent entries.
 */
export default function AutocompleteInput({
  value,
  onChange,
  onSelect,
  options = [],
  placeholder,
  getLabel = (o) => (typeof o === "string" ? o : o.label),
  getSub,
  inputClassName = "",
  error = false,
  name,
  id,
  autoComplete = "off",
}) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const inputRef = useRef(null);

  const filtered = useMemo(() => {
    const q = (value || "").trim().toLowerCase();
    if (!q) return options.slice(0, 8);
    const starts = [];
    const contains = [];
    for (const o of options) {
      const label = (getLabel(o) || "").toLowerCase();
      if (!label) continue;
      if (label === q) continue; // already typed exactly
      if (label.startsWith(q)) starts.push(o);
      else if (label.includes(q)) contains.push(o);
    }
    return [...starts, ...contains].slice(0, 8);
  }, [value, options, getLabel]);

  const select = (option) => {
    onChange(getLabel(option) || "");
    onSelect?.(option);
    setOpen(false);
    setHighlight(-1);
  };

  const onKeyDown = (e) => {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpen(true);
      return;
    }
    if (!open || filtered.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (h + 1) % filtered.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (h <= 0 ? filtered.length - 1 : h - 1));
    } else if (e.key === "Enter") {
      if (highlight >= 0) {
        e.preventDefault();
        select(filtered[highlight]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setHighlight(-1);
    }
  };

  const showDropdown = open && filtered.length > 0;

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        name={name}
        id={id}
        className={`input w-full pr-8 ${error ? "input-error" : ""} ${inputClassName}`}
        placeholder={placeholder}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setHighlight(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          // Delay so option mousedown can fire first
          setTimeout(() => setOpen(false), 120);
        }}
        onKeyDown={onKeyDown}
      />
      {options.length > 0 && (
        <ChevronDown
          className={`pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-base-content/35 transition-transform ${showDropdown ? "rotate-180" : ""}`}
        />
      )}

      {showDropdown && (
        <ul className="absolute z-30 mt-1.5 max-h-64 w-full overflow-auto rounded-xl border border-base-300 bg-base-100 py-1 shadow-xl">
          {!(value || "").trim() && (
            <li className="flex items-center gap-1.5 px-3 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-base-content/40">
              <Clock className="h-3 w-3" /> Recent
            </li>
          )}
          {filtered.map((o, i) => {
            const label = getLabel(o);
            const sub = getSub?.(o);
            return (
              <li key={`${label}-${i}`}>
                <button
                  type="button"
                  className={`block w-full px-3 py-2 text-left text-sm hover:bg-base-200 ${i === highlight ? "bg-base-200" : ""}`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    select(o);
                  }}
                  onMouseEnter={() => setHighlight(i)}
                >
                  <span className="block truncate font-medium">{label}</span>
                  {sub ? (
                    <span className="block truncate text-xs text-base-content/50">{sub}</span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
