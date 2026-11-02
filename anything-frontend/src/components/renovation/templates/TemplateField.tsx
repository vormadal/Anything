"use client";

import type { ReactNode } from "react";
import {
  FIELD_ERROR_CLASS,
  FIELD_INPUT_CLASS,
  FIELD_LABEL_CLASS,
} from "@/components/renovation/room/roomDisplay";

interface TemplateFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  inputMode?: "decimal" | "numeric" | "text";
  className?: string;
}

/** One labelled text input with its inline error. Numbers are typed as text and parsed on save. */
export function TemplateField({
  id,
  label,
  value,
  onChange,
  error,
  disabled,
  inputMode = "text",
  className,
}: TemplateFieldProps) {
  return (
    <div className={className}>
      <label htmlFor={id} className={FIELD_LABEL_CLASS}>
        {label}
      </label>
      <input
        id={id}
        type="text"
        inputMode={inputMode}
        value={value}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => onChange(event.target.value)}
        className={FIELD_INPUT_CLASS}
      />
      {error && (
        <p id={`${id}-error`} role="alert" className={`mt-1 ${FIELD_ERROR_CLASS}`}>
          {error}
        </p>
      )}
    </div>
  );
}

interface TemplateSelectProps {
  id: string;
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  onChange: (value: string) => void;
  disabled?: boolean;
  children?: ReactNode;
}

export function TemplateSelect({ id, label, value, options, onChange, disabled }: TemplateSelectProps) {
  return (
    <div>
      <label htmlFor={id} className={FIELD_LABEL_CLASS}>
        {label}
      </label>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className={FIELD_INPUT_CLASS}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
