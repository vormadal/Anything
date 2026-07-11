"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { TourStep, TourTopic } from "@/lib/tourSteps";

const DESCRIPTION_ID = "tour-step-description";

export type TourView = "menu" | "steps";

interface OnboardingTourDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** All steps visible to the current user (the full tour). */
  steps: TourStep[];
  /** All topics visible to the current user. */
  topics: TourTopic[];
  /** Which view to show when the dialog opens. */
  initialView: TourView;
}

export function OnboardingTourDialog({
  open,
  onOpenChange,
  steps,
  topics,
  initialView,
}: OnboardingTourDialogProps) {
  const router = useRouter();
  // null = follow initialView; set once the user navigates inside the dialog.
  const [view, setView] = useState<TourView | null>(null);
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);

  // Every close (Skip, Done, X, overlay, Escape) goes through here, so the
  // tour always restarts from its initial view when it is reopened.
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setView(null);
      setActiveTopicId(null);
      setStepIndex(0);
    }
    onOpenChange(nextOpen);
  };

  if (steps.length === 0) {
    return null;
  }

  const effectiveView = view ?? initialView;
  const activeSteps = activeTopicId
    ? steps.filter((step) => step.topicId === activeTopicId)
    : steps;

  const close = () => handleOpenChange(false);

  const backToMenu = () => {
    setView("menu");
    setActiveTopicId(null);
    setStepIndex(0);
  };

  const startTopic = (topicId: string | null) => {
    setActiveTopicId(topicId);
    setStepIndex(0);
    setView("steps");
  };

  const goToRoute = (stepRoute: string) => {
    close();
    router.push(stepRoute);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent aria-describedby={DESCRIPTION_ID}>
        {effectiveView === "menu" ? (
          <MenuView
            steps={steps}
            topics={topics}
            onStartTopic={startTopic}
            onClose={close}
          />
        ) : (
          <StepsView
            steps={activeSteps}
            stepIndex={stepIndex}
            onStepIndexChange={setStepIndex}
            isTopicTour={activeTopicId !== null}
            showBackToMenu={initialView === "menu"}
            onBackToMenu={backToMenu}
            onClose={close}
            onGoToRoute={goToRoute}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface MenuViewProps {
  steps: TourStep[];
  topics: TourTopic[];
  onStartTopic: (topicId: string | null) => void;
  onClose: () => void;
}

function MenuView({ steps, topics, onStartTopic, onClose }: MenuViewProps) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>Take a tour</DialogTitle>
      </DialogHeader>

      <p
        id={DESCRIPTION_ID}
        className="mt-2 text-sm text-gray-600 dark:text-gray-300"
      >
        Pick an area to explore, or take the full tour.
      </p>

      <Button className="mt-4 w-full" onClick={() => onStartTopic(null)}>
        Full tour ({steps.length} steps)
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>

      <div className="mt-3 space-y-1">
        {topics.map((topic) => {
          const Icon = topic.icon;
          return (
            <button
              key={topic.id}
              onClick={() => onStartTopic(topic.id)}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                <Icon className="h-4 w-4 text-gray-700 dark:text-gray-200" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-gray-900 dark:text-white">
                  {topic.label}
                </span>
                <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">
                  {topic.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex justify-end">
        <Button variant="ghost" onClick={onClose}>
          Close tour
        </Button>
      </div>
    </>
  );
}

interface StepsViewProps {
  steps: TourStep[];
  stepIndex: number;
  onStepIndexChange: (index: number) => void;
  /** True when a single topic (not the full tour) is being viewed. */
  isTopicTour: boolean;
  /** Show a "Topics" button (back to menu) instead of "Skip". */
  showBackToMenu: boolean;
  onBackToMenu: () => void;
  onClose: () => void;
  onGoToRoute: (route: string) => void;
}

function StepsView({
  steps,
  stepIndex,
  onStepIndexChange,
  isTopicTour,
  showBackToMenu,
  onBackToMenu,
  onClose,
  onGoToRoute,
}: StepsViewProps) {
  // The visible step list can shrink while open (e.g. switching household).
  const currentIndex = Math.min(stepIndex, steps.length - 1);
  const step = steps[currentIndex];
  const isLastStep = currentIndex === steps.length - 1;
  const Icon = step.icon;
  const route = step.route;

  // Finishing a topic guide returns to the menu to pick another area;
  // finishing the full tour closes the dialog.
  const handleDone = () => {
    if (isTopicTour) {
      onBackToMenu();
    } else {
      onClose();
    }
  };

  return (
    <>
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
          onClick={() => onGoToRoute(route)}
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
            onClick={() => onStepIndexChange(i)}
            className={`h-2.5 w-2.5 rounded-full transition-colors ${
              i === currentIndex
                ? "bg-gray-900 dark:bg-white"
                : "bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500"
            }`}
          />
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between">
        {showBackToMenu ? (
          <Button variant="ghost" onClick={onBackToMenu}>
            Topics
          </Button>
        ) : (
          <Button variant="ghost" onClick={onClose}>
            Skip
          </Button>
        )}
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={currentIndex === 0}
            onClick={() => onStepIndexChange(currentIndex - 1)}
          >
            Back
          </Button>
          {isLastStep ? (
            <Button onClick={handleDone}>Done</Button>
          ) : (
            <Button onClick={() => onStepIndexChange(currentIndex + 1)}>
              Next
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
