import { formatQty } from "@/lib/renovation";
import { cn } from "@/lib/utils";
import { StepHeading } from "./StepHeading";
import {
  DIMENSION_FIELDS,
  dimensionError,
  floorPlanSize,
  measurementsFor,
  openingsText,
  toRoomDimensions,
  type CountKey,
  type DimensionFields,
  type DimensionKey,
} from "./roomWizardModel";

interface RoomSizeStepProps {
  dims: DimensionFields;
  onDimensionChange: (key: DimensionKey, value: string) => void;
  onCountChange: (key: CountKey, delta: number) => void;
}

const STEPPER_BUTTON =
  "flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-background text-lg text-foreground disabled:opacity-40";

function CountStepper({
  label,
  noun,
  value,
  onChange,
}: {
  label: string;
  noun: string;
  value: number;
  onChange: (delta: number) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2">
      <span className="text-sm font-medium">{label}</span>
      <span className="flex items-center gap-1">
        <button
          type="button"
          aria-label={`Fewer ${noun}s`}
          onClick={() => onChange(-1)}
          disabled={value === 0}
          className={STEPPER_BUTTON}
        >
          −
        </button>
        <span className="min-w-5 text-center text-[15px] font-semibold tabular-nums">{value}</span>
        <button
          type="button"
          aria-label={`More ${noun}s`}
          onClick={() => onChange(1)}
          className={STEPPER_BUTTON}
        >
          +
        </button>
      </span>
    </div>
  );
}

function FloorPlan({ length, width, height, floorText }: { length: number; width: number; height: number; floorText: string }) {
  const plan = floorPlanSize(length, width);
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl bg-muted/50 px-4 py-5">
      <div className="flex h-[150px] items-center justify-center">
        <div
          aria-hidden="true"
          style={{ width: plan.width, height: plan.height }}
          className="flex items-center justify-center rounded border-2 border-blue-900 bg-blue-100 text-[13px] font-semibold text-blue-900 dark:bg-blue-950 dark:text-blue-100"
        >
          {floorText}
        </div>
      </div>
      <span className="text-xs text-muted-foreground">
        {length} m × {width} m, ceiling {height} m
      </span>
    </div>
  );
}

function MeasurementRow({ label, detail, value, last }: { label: string; detail?: string; value: string; last?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between gap-2 px-3.5 py-3", !last && "border-b border-border")}>
      <dt className="flex flex-col text-sm">
        {label}
        {detail && <span className="text-xs text-muted-foreground">{detail}</span>}
      </dt>
      <dd className="text-sm font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

export function RoomSizeStep({ dims, onDimensionChange, onCountChange }: RoomSizeStepProps) {
  const sizes = toRoomDimensions(dims);
  const measurements = measurementsFor(dims);
  const floorText = formatQty(measurements.floorArea, "m²");

  return (
    <div className="flex flex-col gap-5">
      <StepHeading
        title="How big is it?"
        description="Floor, wall and skirting quantities are calculated from these."
      />

      <div className="grid grid-cols-3 gap-2.5">
        {DIMENSION_FIELDS.map(({ key, label }) => {
          const error = dimensionError(dims[key]);
          const errorId = `room-${key}-error`;
          return (
            <div key={key} className="flex flex-col gap-1.5">
              <label htmlFor={`room-${key}`} className="text-[13px] font-medium">
                {label}
              </label>
              <input
                id={`room-${key}`}
                type="number"
                inputMode="decimal"
                step="0.1"
                min="0"
                value={dims[key]}
                onChange={(event) => onDimensionChange(key, event.target.value)}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? errorId : undefined}
                className={cn(
                  "h-11 w-full rounded-lg border bg-background px-2.5 text-[15px]",
                  error ? "border-red-600" : "border-input",
                )}
              />
              {error && (
                <p id={errorId} className="text-xs text-red-700 dark:text-red-400">
                  {error}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <CountStepper
          label="Doors"
          noun="door"
          value={dims.doors}
          onChange={(delta) => onCountChange("doors", delta)}
        />
        <CountStepper
          label="Windows"
          noun="window"
          value={dims.windows}
          onChange={(delta) => onCountChange("windows", delta)}
        />
      </div>

      <FloorPlan length={sizes.length} width={sizes.width} height={sizes.height} floorText={floorText} />

      <dl className="rounded-xl border border-border">
        <MeasurementRow label="Floor area" value={floorText} />
        <MeasurementRow
          label="Wall area"
          detail={openingsText(dims.doors, dims.windows)}
          value={formatQty(measurements.wallArea, "m²")}
        />
        <MeasurementRow label="Perimeter (skirting)" value={formatQty(measurements.perimeter, "m")} last />
      </dl>
    </div>
  );
}
