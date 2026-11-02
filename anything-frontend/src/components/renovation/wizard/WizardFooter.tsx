import { Button } from "@/components/ui/button";
import { formatKr } from "@/lib/renovation";
import type { WizardStep } from "./roomWizardModel";

interface WizardFooterProps {
  step: WizardStep;
  total: number;
  name: string;
  canAdvance: boolean;
  canSubmit: boolean;
  isSubmitting: boolean;
  submitError: string | null;
  onBack: () => void;
  onNext: () => void;
}

export function WizardFooter({
  step,
  total,
  name,
  canAdvance,
  canSubmit,
  isSubmitting,
  submitError,
  onBack,
  onNext,
}: WizardFooterProps) {
  const isFinalStep = step === 3;
  return (
    <footer className="sticky bottom-0 flex flex-col gap-3 border-t border-border bg-background px-4 pb-4 pt-3">
      {submitError && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          Couldn&apos;t add the room: {submitError}
        </p>
      )}
      <div className="flex items-baseline justify-between">
        <span className="text-[13px] text-muted-foreground">
          {isFinalStep ? "Room estimate" : "Estimate with default scope"}
        </span>
        <span data-testid="wizard-total" className="text-xl font-bold tabular-nums">
          {formatKr(total)}
        </span>
      </div>
      <div className="flex gap-2.5">
        {step > 1 && (
          <Button type="button" variant="outline" className="h-11 px-4" onClick={onBack} disabled={isSubmitting}>
            Back
          </Button>
        )}
        {isFinalStep ? (
          <Button type="submit" className="h-11 flex-1" disabled={!canSubmit || isSubmitting}>
            {isSubmitting ? "Adding…" : `Add ${name} to project`}
          </Button>
        ) : (
          <Button type="button" className="h-11 flex-1" onClick={onNext} disabled={!canAdvance}>
            Continue
          </Button>
        )}
      </div>
    </footer>
  );
}
