import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronDown } from "lucide-react";

export function Field({
  label,
  children,
  hint,
  className,
}: {
  label: string;
  children: ReactNode;
  hint?: string | undefined;
  className?: string | undefined;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label className="text-[12px] text-ink/70">{label}</Label>
      {children}
      {hint && <p className="text-[11px] text-ink/45">{hint}</p>}
    </div>
  );
}

export function TextField(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  ltr?: boolean;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  list?: string;
  hint?: string;
  className?: string;
}) {
  const { label, value, onChange, ltr, hint, className, ...rest } = props;
  return (
    <Field label={label} hint={hint} className={className}>
      <Input
        dir={ltr ? "ltr" : undefined}
        className={ltr ? "text-left" : ""}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        {...rest}
      />
    </Field>
  );
}

/**
 * Free-text field with suggestions from existing records.
 * Typing a new value is allowed; picking an existing one reports the match
 * so the caller can auto-fill related data (e.g. the phone number).
 */
export function ComboField({
  label,
  value,
  onChange,
  options,
  onPick,
  required,
  disabled,
  hint,
  listId,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { name: string; phone: string }[];
  onPick?: (opt: { name: string; phone: string }) => void;
  required?: boolean;
  disabled?: boolean;
  hint?: string;
  listId: string;
  className?: string | undefined;
}) {
  return (
    <Field label={label} hint={hint ?? "اكتب اسماً جديداً أو اختر من المسجّلين"} className={className}>
      <Input
        list={listId}
        value={value}
        required={required}
        disabled={disabled}
        autoComplete="off"
        onChange={(e) => {
          const v = e.target.value;
          onChange(v);
          const match = options.find((o) => o.name === v);
          if (match && onPick) onPick(match);
        }}
      />
      <datalist id={listId}>
        {options.map((o) => (
          <option key={o.name} value={o.name}>
            {o.phone || ""}
          </option>
        ))}
      </datalist>
    </Field>
  );
}

/**
 * Free-text field with an always-available dropdown of suggestions.
 * The list opens via the arrow button even when a value is already typed,
 * and typing a new value is still allowed.
 */
export function SuggestField({
  label,
  value,
  onChange,
  options,
  required,
  disabled,
  hint,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
  required?: boolean;
  disabled?: boolean;
  hint?: string;
  className?: string | undefined;
}) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const q = value.trim();
  const list = q ? options.filter((o) => o.includes(q) || q.includes(o)) : [...options];

  return (
    <Field label={label} hint={hint} className={className}>
      <div ref={boxRef} className="relative">
        <Input
          value={value}
          required={required}
          disabled={disabled}
          autoComplete="off"
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="pl-9"
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          aria-label="إظهار القائمة"
          onClick={() => setOpen((o) => !o)}
          className="absolute inset-y-0 left-0 flex w-9 items-center justify-center text-ink/60 hover:text-ink disabled:opacity-50"
        >
          <ChevronDown className="size-4" />
        </button>
        {open && !disabled && (
          <div className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-md">
            {list.length === 0 ? (
              <p className="px-2 py-1.5 text-sm text-ink/50">لا توجد مطابقة — اكتب الاسم كما تريد</p>
            ) : (
              list.map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => {
                    onChange(o);
                    setOpen(false);
                  }}
                  className={`block w-full rounded-sm px-2 py-1.5 text-right text-sm hover:bg-accent ${
                    o === value ? "bg-accent font-semibold" : ""
                  }`}
                >
                  {o}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </Field>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  disabled,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
  disabled?: boolean;
  className?: string | undefined;
}) {
  return (
    <Field label={label} className={className}>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </Field>
  );
}
