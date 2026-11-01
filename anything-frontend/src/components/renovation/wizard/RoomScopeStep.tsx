import type {
  RenovationMaterialResponse,
  RenovationRoomTemplateResponse,
} from "@/lib/api-client/models/index";
import {
  estimateTemplateRoom,
  formatKr,
  formatQty,
  round2,
  type TemplateLineEstimate,
} from "@/lib/renovation";
import { cn } from "@/lib/utils";
import { StepHeading } from "./StepHeading";
import { allLineKeys, scopeGroups, toRoomDimensions, type DimensionFields } from "./roomWizardModel";

interface RoomScopeStepProps {
  template: RenovationRoomTemplateResponse;
  dims: DimensionFields;
  selectedKeys: readonly string[];
  materialsByName: ReadonlyMap<string, RenovationMaterialResponse>;
  onToggle: (key: string) => void;
}

function ScopeRow({
  line,
  checked,
  onToggle,
}: {
  line: TemplateLineEstimate;
  checked: boolean;
  onToggle: () => void;
}) {
  const calc = `${formatQty(line.quantity, line.unit)} × ${formatKr(line.unitPrice)}`;
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 border-t border-border px-3.5 py-3 first:border-t-0",
        checked ? "bg-background" : "bg-muted/50 text-muted-foreground",
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="mt-0.5 h-5 w-5 shrink-0 accent-foreground"
      />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-sm font-semibold">{line.label}</span>
        <span className="text-xs text-muted-foreground">{line.description}</span>
        <span className="text-xs text-muted-foreground">{calc}</span>
      </span>
      <span className="whitespace-nowrap text-sm font-semibold">
        {checked ? formatKr(line.estimate) : "—"}
      </span>
    </label>
  );
}

export function RoomScopeStep({ template, dims, selectedKeys, materialsByName, onToggle }: RoomScopeStepProps) {
  // Every line is priced so unticked rows can still show what they would cost.
  const priced = estimateTemplateRoom(template, toRoomDimensions(dims), allLineKeys(template), materialsByName);
  const pricedByKey = new Map(priced.lines.map((line) => [line.key, line]));
  const selected = new Set(selectedKeys);
  const groups = scopeGroups(template);

  return (
    <div className="flex flex-col gap-5">
      <StepHeading
        title="What are you doing?"
        description="Untick what you're keeping. Prices are your material defaults."
      />
      {groups.map((group) => {
        const rows = group.lines
          .map((line) => ({ key: line.key ?? "", estimate: pricedByKey.get(line.key ?? "") }))
          .filter((row): row is { key: string; estimate: TemplateLineEstimate } => row.estimate !== undefined);
        const subtotal = round2(
          rows.reduce((sum, row) => sum + (selected.has(row.key) ? row.estimate.estimate : 0), 0),
        );
        return (
          <section key={group.name} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between">
              <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
                {group.name}
              </h2>
              <span className="text-[13px] text-muted-foreground">{formatKr(subtotal)}</span>
            </div>
            <div className="flex flex-col overflow-hidden rounded-xl border border-border">
              {rows.map((row) => (
                <ScopeRow
                  key={row.key}
                  line={row.estimate}
                  checked={selected.has(row.key)}
                  onToggle={() => onToggle(row.key)}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
