"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { TourStep } from "@/lib/tourSteps";

const DESCRIPTION_ID = "tour-step-description";

interface OnboardingTourDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  steps: TourStep[];
}

export function OnboardingTourDialog({
  open,
  onOpenChange,
  steps,
}: OnboardingTourDialogProps) {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);

  // Every close (Skip, Done, X, overlay, Escape) goes through here, so the
  // tour always restarts from the first step when it is reopened.
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setStepIndex(0);
    }
    onOpenChange(nextOpen);
  };

  if (steps.length === 0) {
    return null;
  }

  // The visible step list can shrink while open (e.g. switching household).
  const currentIndex = Math.min(stepIndex, steps.length - 1);
  const step = steps[currentIndex];
  const isLastStep = currentIndex === steps.length - 1;
  const Icon = step.icon;
  const route = step.route;

  const close = () => handleOpenChange(false);

  const goToRoute = (route: string) => {
    close();
    router.push(route);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent aria-describedby={DESCRIPTION_ID}>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
              <Icon className="h-5 w-5 text-gray-700 dark:text-gray-200" />
            </span>
            <DialogTitle>{step.title}</DialogTitle>
          </div>
        </DialogHeader>

        <p
          id={DESCRIPTION_ID}
          className="mt-3 text-sm text-gray-600 dark:text-gray-300"
        >
          {step.description}
        </p>

        {route && (
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => goToRoute(route)}
          >
            Take me there
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}

        <div className="mt-6 flex justify-center gap-2">
          {steps.map((s, i) => (
            <button
              key={s.id}
              aria-label={`Go to step ${i + 1}`}
              onClick={() => setStepIndex(i)}
              className={`h-2.5 w-2.5 rounded-full transition-colors ${
                i === currentIndex
                  ? "bg-gray-900 dark:bg-white"
                  : "bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500"
              }`}
            />
          ))}
        </div>

        <DialogFooter className="sm:justify-between">
          <Button variant="ghost" onClick={close}>
            Skip
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={currentIndex === 0}
              onClick={() => setStepIndex(currentIndex - 1)}
            >
              Back
            </Button>
            {isLastStep ? (
              <Button onClick={close}>Done</Button>
            ) : (
              <Button onClick={() => setStepIndex(currentIndex + 1)}>
                Next
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
