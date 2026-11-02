"use client";

import { useMemo, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatKr } from "@/lib/renovation";
import {
  useDeleteRenovationRoomTemplate,
  useSaveRenovationRoomTemplate,
} from "@/hooks/useRenovation";
import type { RenovationMaterialResponse, RenovationRoomTemplateResponse } from "@/lib/api-client/models/index";
import { TemplateField } from "./TemplateField";
import { TemplateConfirmDialog } from "./TemplateConfirmDialog";
import { TemplateLineRow } from "./TemplateLineRow";
import {
  estimateForm,
  formToInput,
  hasTemplateErrors,
  newTemplateLine,
  templateToForm,
  validateTemplateForm,
  type LineErrors,
  type TemplateForm,
  type TemplateLineForm,
} from "./templateModel";

// Form-level copy, kept here so the wording stays in one place.
const SAVE_FAILED = "Couldn't save the template. Try again.";
const REMOVE_FAILED = "Couldn't update the template. Try again.";
const READ_ONLY_NOTE = "Only household owners and admins can change room templates.";
const MAX_LINES = 100;
const NO_LINE_ERRORS: LineErrors = {};
const SECTION_HEADING_CLASS = "text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400";

const SIZE_FIELDS: readonly { key: "length" | "width" | "height"; label: string }[] = [
  { key: "length", label: "Length (m)" },
  { key: "width", label: "Width (m)" },
  { key: "height", label: "Height (m)" },
];

const OPENING_FIELDS: readonly { key: "doors" | "windows"; label: string }[] = [
  { key: "doors", label: "Doors" },
  { key: "windows", label: "Windows" },
];

type Pending = "reset" | "remove" | null;
type TextFieldKey = "label" | "length" | "width" | "height" | "doors" | "windows";

export interface TemplateEditorProps {
  roomType: string;
  /** Undefined for a room type that has not been saved yet. */
  template: RenovationRoomTemplateResponse | undefined;
  draftLabel: string;
  materials: readonly RenovationMaterialResponse[];
  canManage: boolean;
  onCreated: (roomType: string) => void;
  onReset: () => void;
  onRemoved: () => void;
}

/** Edits one room type's template. Mount it keyed by room type so each one starts from its own form state. */
export function TemplateEditor({
  roomType,
  template,
  draftLabel,
  materials,
  canManage,
  onCreated,
  onReset,
  onRemoved,
}: TemplateEditorProps) {
  const isNew = template === undefined;
  const readOnly = !canManage;
  const [form, setForm] = useState<TemplateForm>(() => templateToForm(template, draftLabel));
  const [submitted, setSubmitted] = useState(false);
  const [openLineId, setOpenLineId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending>(null);
  const nextLineSeq = useRef(0);
  const saveTemplate = useSaveRenovationRoomTemplate();
  const removeTemplate = useDeleteRenovationRoomTemplate();

  const errors = useMemo(() => validateTemplateForm(form), [form]);
  const estimate = useMemo(() => estimateForm(form, materials), [form, materials]);
  const onCount = form.lines.filter((line) => line.enabledByDefault).length;
  const isBuiltIn = template?.isBuiltIn === true;
  const canReset = isBuiltIn && template?.isCustomised === true;
  const canRemove = !isNew && !isBuiltIn;
  const fieldError = (key: TextFieldKey) => (submitted ? errors[key] : undefined);

  const setField = (key: TextFieldKey, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const updateLine = (id: string, patch: Partial<TemplateLineForm>) =>
    setForm((current) => ({
      ...current,
      lines: current.lines.map((line) => (line.id === id ? { ...line, ...patch } : line)),
    }));

  const moveLine = (index: number, direction: -1 | 1) =>
    setForm((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.lines.length) return current;
      const lines = [...current.lines];
      [lines[index], lines[target]] = [lines[target], lines[index]];
      return { ...current, lines };
    });

  const removeLine = (id: string) => {
    setForm((current) => ({ ...current, lines: current.lines.filter((line) => line.id !== id) }));
    setOpenLineId((current) => (current === id ? null : current));
  };

  const addLine = () => {
    const id = `new-${nextLineSeq.current}`;
    nextLineSeq.current += 1;
    setForm((current) => ({ ...current, lines: [...current.lines, newTemplateLine(id)] }));
    setOpenLineId(id);
  };

  const handleSave = async () => {
    setSubmitted(true);
    setActionError(null);
    if (hasTemplateErrors(errors)) return;
    try {
      await saveTemplate.mutateAsync({ roomType, ...formToInput(form) });
      if (isNew) onCreated(roomType);
    } catch {
      setActionError(SAVE_FAILED);
    }
  };

  const handleConfirm = async () => {
    const kind = pending;
    setPending(null);
    try {
      await removeTemplate.mutateAsync(roomType);
      if (kind === "reset") onReset();
      else onRemoved();
    } catch {
      setActionError(REMOVE_FAILED);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {readOnly && <p className="rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-300">{READ_ONLY_NOTE}</p>}

      <TemplateField
        id="template-label"
        label="Room type name"
        value={form.label}
        onChange={(value) => setField("label", value)}
        error={fieldError("label")}
        disabled={readOnly}
      />

      <section aria-label="Default size" className="flex flex-col gap-2">
        <h2 className={SECTION_HEADING_CLASS}>Default size</h2>
        <div className="grid grid-cols-3 gap-3">
          {SIZE_FIELDS.map((field) => (
            <TemplateField
              key={field.key}
              id={`template-${field.key}`}
              label={field.label}
              inputMode="decimal"
              value={form[field.key]}
              onChange={(value) => setField(field.key, value)}
              error={fieldError(field.key)}
              disabled={readOnly}
            />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {OPENING_FIELDS.map((field) => (
            <TemplateField
              key={field.key}
              id={`template-${field.key}`}
              label={field.label}
              inputMode="numeric"
              value={form[field.key]}
              onChange={(value) => setField(field.key, value)}
              error={fieldError(field.key)}
              disabled={readOnly}
            />
          ))}
        </div>
      </section>

      <section aria-label="Template lines" className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <h2 className={SECTION_HEADING_CLASS}>Lines</h2>
          <span className="text-xs text-gray-500 dark:text-gray-400">On by default</span>
        </div>
        <ul className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
          {form.lines.map((line, index) => (
            <TemplateLineRow
              key={line.id}
              line={line}
              errors={submitted ? (errors.lines[line.id] ?? NO_LINE_ERRORS) : NO_LINE_ERRORS}
              open={openLineId === line.id}
              readOnly={readOnly}
              isFirst={index === 0}
              isLast={index === form.lines.length - 1}
              onToggleOpen={() => setOpenLineId((current) => (current === line.id ? null : line.id))}
              onChange={(patch) => updateLine(line.id, patch)}
              onMove={(direction) => moveLine(index, direction)}
              onRemove={() => removeLine(line.id)}
            />
          ))}
        </ul>
        {form.lines.length === 0 && (
          <p className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">No lines yet</p>
        )}
        {!readOnly && (
          <Button
            variant="outline"
            className="h-11 border-dashed"
            onClick={addLine}
            disabled={form.lines.length >= MAX_LINES}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add line
          </Button>
        )}
      </section>

      <section
        aria-label="Preview"
        className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 p-4 dark:bg-gray-800"
      >
        <div className="flex flex-col gap-0.5">
          <span className="text-sm text-gray-600 dark:text-gray-400">At default size</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">{onCount} lines on</span>
        </div>
        <span className="text-right text-lg font-bold text-gray-900 dark:text-white">
          {estimate ? `≈ ${formatKr(estimate.total)}` : "Enter a size"}
        </span>
      </section>

      {actionError && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {actionError}
        </p>
      )}

      {!readOnly && (
        <div className="flex flex-col gap-2">
          <Button className="h-11" onClick={() => void handleSave()} disabled={saveTemplate.isPending}>
            {isNew ? "Create room type" : "Save template"}
          </Button>
          {canReset && (
            <Button variant="ghost" className="h-11" onClick={() => setPending("reset")}>
              Reset to default
            </Button>
          )}
          {canRemove && (
            <Button variant="ghost" className="h-11 text-red-600 dark:text-red-400" onClick={() => setPending("remove")}>
              Delete room type
            </Button>
          )}
        </div>
      )}

      <TemplateConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => !open && setPending(null)}
        title={pending === "reset" ? "Reset to the default template?" : "Delete this room type?"}
        message={
          pending === "reset"
            ? "Your changes to this room type are discarded and the built-in template comes back. Rooms already created are not changed."
            : "This removes the room type and its template. Rooms already created are not changed."
        }
        confirmLabel={pending === "reset" ? "Reset" : "Delete"}
        isPending={removeTemplate.isPending}
        onConfirm={() => void handleConfirm()}
      />
    </div>
  );
}
