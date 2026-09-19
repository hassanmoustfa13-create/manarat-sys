import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
