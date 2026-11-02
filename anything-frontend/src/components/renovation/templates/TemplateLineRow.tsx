"use client";

import { useId } from "react";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { BASIS_LABELS, BASIS_OPTIONS, GROUP_OPTIONS } from "@/components/renovation/room/roomDisplay";
import type { LineErrors, TemplateLineForm } from "./templateModel";
import { TemplateField, TemplateSelect } from "./TemplateField";

interface TemplateLineRowProps {
  line: TemplateLineForm;
  errors: LineErrors;
  open: boolean;
  readOnly: boolean;
  isFirst: boolean;
  isLast: boolean;
  onToggleOpen: () => void;
  onChange: (patch: Partial<TemplateLineForm>) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}

const CHIP_CLASS = "rounded-full px-2 py-0.5 text-xs font-medium";
const BASIS_CHIP_CLASS = `${CHIP_CLASS} bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200`;
const WASTE_CHIP_CLASS = `${CHIP_CLASS} bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300`;
const ICON_BUTTON_CLASS = "h-11 w-11 shrink-0";

function summaryPrice(line: TemplateLineForm): string {
  if (line.defaultPrice.trim() === "") return "No price set";
  const unit = line.basis === "Fixed" ? "" : `/${line.unit.trim()}`;
  return `${line.defaultPrice.trim()} kr${unit}`;
}

/** One template line: a summary row with its on-by-default switch, expandable into the full fields. */
export function TemplateLineRow({
  line,
  errors,
  open,
  readOnly,
  isFirst,
  isLast,
  onToggleOpen,
  onChange,
  onMove,
  onRemove,
}: TemplateLineRowProps) {
  const idPrefix = useId();
  const name = line.label.trim() || "line";
  const basisLabel = BASIS_LABELS[line.basis as keyof typeof BASIS_LABELS] ?? line.basis;
  const hasWaste = Number(line.wastePercent) > 0;
  const field = (key: string) => `${idPrefix}-${key}`;

  return (
    <li className="border-t border-gray-100 first:border-t-0 dark:border-gray-700">
      <div className="flex min-h-16 items-center gap-3 px-3 py-2.5">
        <button
          type="button"
          onClick={onToggleOpen}
          aria-expanded={open}
          disabled={readOnly}
          className="flex min-w-0 flex-1 flex-col gap-1 text-left disabled:cursor-default"
        >
          <span className="text-sm font-semibold text-gray-900 dark:text-white">{line.label || "Untitled line"}</span>
          <span className="truncate text-xs text-gray-600 dark:text-gray-400">
            {line.materialName || "No material"} · {summaryPrice(line)}
          </span>
          <span className="flex flex-wrap gap-1.5">
            <span className={BASIS_CHIP_CLASS}>
              {basisLabel}
              {line.basis === "Fixed" && line.fixedQuantity.trim() !== "" ? ` · ${line.fixedQuantity.trim()}` : ""}
            </span>
            {hasWaste && <span className={WASTE_CHIP_CLASS}>+{line.wastePercent.trim()}% waste</span>}
          </span>
        </button>
        <Switch
          checked={line.enabledByDefault}
          disabled={readOnly}
          onCheckedChange={(checked) => onChange({ enabledByDefault: checked })}
          aria-label={`${name} on by default`}
          className="shrink-0"
        />
        {!readOnly && (
          <div className="flex shrink-0 flex-col">
            <Button
              variant="ghost"
              size="icon"
              className={ICON_BUTTON_CLASS}
              onClick={() => onMove(-1)}
              disabled={isFirst}
              aria-label={`Move ${name} up`}
            >
              <ChevronUp className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={ICON_BUTTON_CLASS}
              onClick={() => onMove(1)}
              disabled={isLast}
              aria-label={`Move ${name} down`}
            >
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        )}
      </div>

      {open && !readOnly && (
        <div className="grid grid-cols-1 gap-3 border-t border-gray-100 bg-gray-50 px-3 py-3 sm:grid-cols-2 dark:border-gray-700 dark:bg-gray-900/40">
          <TemplateField
            id={field("label")}
            label="Line name"
            value={line.label}
            onChange={(label) => onChange({ label })}
            error={errors.label ?? errors.key}
          />
          <TemplateField
            id={field("material")}
            label="Material"
            value={line.materialName}
            onChange={(materialName) => onChange({ materialName })}
            error={errors.materialName}
          />
          <TemplateField
            id={field("category")}
            label="Category"
            value={line.category}
            onChange={(category) => onChange({ category })}
            error={errors.category}
          />
          <TemplateSelect
            id={field("group")}
            label="Group"
            value={line.group}
            options={GROUP_OPTIONS}
            onChange={(group) => onChange({ group })}
          />
          <TemplateSelect
            id={field("basis")}
            label="Quantity basis"
            value={line.basis}
            options={BASIS_OPTIONS}
            onChange={(basis) => onChange({ basis })}
          />
          <TemplateField
            id={field("unit")}
            label="Unit"
            value={line.unit}
            onChange={(unit) => onChange({ unit })}
            error={errors.unit}
          />
          {line.basis === "Fixed" && (
            <TemplateField
              id={field("fixed")}
              label="Fixed quantity"
              inputMode="decimal"
              value={line.fixedQuantity}
              onChange={(fixedQuantity) => onChange({ fixedQuantity })}
              error={errors.fixedQuantity}
            />
          )}
          <TemplateField
            id={field("price")}
            label="Default price (kr)"
            inputMode="decimal"
            value={line.defaultPrice}
            onChange={(defaultPrice) => onChange({ defaultPrice })}
            error={errors.defaultPrice}
          />
          <TemplateField
            id={field("waste")}
            label="Waste %"
            inputMode="decimal"
            value={line.wastePercent}
            onChange={(wastePercent) => onChange({ wastePercent })}
            error={errors.wastePercent}
          />
          <div className="flex items-end sm:col-span-2">
            <Button variant="outline" className="h-11" onClick={onToggleOpen}>
              Done
            </Button>
            <Button
              variant="ghost"
              className="ml-auto h-11 text-red-600 dark:text-red-400"
              onClick={onRemove}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Remove line
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}
