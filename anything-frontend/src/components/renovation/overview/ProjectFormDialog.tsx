"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FIELD_INPUT_CLASS, FIELD_LABEL_CLASS, OFFLINE_HINT } from "@/components/inventory/inventoryFormStyles";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export interface ProjectFormValues {
  name: string;
  budget?: number;
}

export interface ProjectFormInitial {
  name: string;
  budget?: number | null;
}

interface ProjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  submitLabel: string;
  initial?: ProjectFormInitial;
  isPending: boolean;
  onSubmit: (values: ProjectFormValues) => void;
}

/** Create and edit a renovation project's name and optional budget. */
export function ProjectFormDialog(props: ProjectFormDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{props.title}</DialogTitle>
        </DialogHeader>
        {/* Radix unmounts the content when closed, so the fields reset on every open. */}
        <ProjectFormFields {...props} />
      </DialogContent>
    </Dialog>
  );
}

function ProjectFormFields({
  onOpenChange,
  submitLabel,
  initial,
  isPending,
  onSubmit,
}: ProjectFormDialogProps) {
  const isOnline = useOnlineStatus();
  const [name, setName] = useState(initial?.name ?? "");
  const [budgetText, setBudgetText] = useState(
    initial?.budget !== undefined && initial?.budget !== null ? String(initial.budget) : "",
  );
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Give the project a name.");
      return;
    }
    let budget: number | undefined;
    if (budgetText.trim() !== "") {
      budget = Number(budgetText);
      if (Number.isNaN(budget) || budget < 0) {
        setError("The budget must be a positive amount.");
        return;
      }
    }
    setError(null);
    onSubmit({ name: trimmed, budget });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="renovation-project-name" className={FIELD_LABEL_CLASS}>
          Name
        </label>
        <input
          id="renovation-project-name"
          className={FIELD_INPUT_CLASS}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
        />
      </div>
      <div>
        <label htmlFor="renovation-project-budget" className={FIELD_LABEL_CLASS}>
          Budget (kr, optional)
        </label>
        <input
          id="renovation-project-budget"
          className={FIELD_INPUT_CLASS}
          type="number"
          inputMode="numeric"
          min="0"
          step="1"
          value={budgetText}
          onChange={(e) => setBudgetText(e.target.value)}
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" className="h-11" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button
          type="submit"
          className="h-11"
          disabled={isPending || !isOnline}
          title={isOnline ? undefined : OFFLINE_HINT}
        >
          {isPending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
