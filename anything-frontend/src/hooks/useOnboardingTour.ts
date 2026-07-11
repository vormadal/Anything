"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useCurrentUser, useIsAuthenticated } from "@/hooks/useAuth";
import { useHouseholdContext } from "@/context/HouseholdContext";
import {
  getVisibleTourSteps,
  getVisibleTourTopics,
  hasSeenTour,
  markTourSeen,
} from "@/lib/tourSteps";
import type { TourView } from "@/components/OnboardingTourDialog";

// Drives the onboarding tour dialog: filters steps by the current user's
// roles and auto-opens the tour once the user belongs to a household.
export function useOnboardingTour() {
  const [manuallyOpened, setManuallyOpened] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const isAuthenticated = useIsAuthenticated();
  const { data: user } = useCurrentUser();
  const { households, isLoading, currentHouseholdRole } =
    useHouseholdContext();

  // Read the seen flag once; while the tour is auto-open the flag is already
  // written, so a live read would immediately close it again.
  const seenInitially = useMemo(() => hasSeenTour(), []);

  const visibilityCtx = useMemo(
    () => ({
      householdRole: currentHouseholdRole,
      userRole: user?.role,
    }),
    [currentHouseholdRole, user?.role]
  );
  const steps = useMemo(
    () => getVisibleTourSteps(visibilityCtx),
    [visibilityCtx]
  );
  const topics = useMemo(
    () => getVisibleTourTopics(visibilityCtx),
    [visibilityCtx]
  );

  // The tour only makes sense with household context, so wait until the
  // user has at least one household (created or joined via invite).
  const autoOpen =
    !seenInitially &&
    !dismissed &&
    isAuthenticated &&
    !isLoading &&
    households.length > 0;

  // Mark seen as soon as the tour auto-opens so it happens exactly once,
  // even if it is dismissed midway or the page is left without closing it.
  useEffect(() => {
    if (autoOpen) {
      markTourSeen();
    }
  }, [autoOpen]);

  const setOpen = useCallback((nextOpen: boolean) => {
    if (nextOpen) {
      setManuallyOpened(true);
    } else {
      setManuallyOpened(false);
      setDismissed(true);
    }
  }, []);

  const startTour = useCallback(() => {
    markTourSeen();
    setManuallyOpened(true);
  }, []);

  // First-time auto-open drops straight into the full tour; opening from
  // the nav drawer shows the topic menu.
  const initialView: TourView = manuallyOpened ? "menu" : "steps";

  return {
    open: manuallyOpened || autoOpen,
    setOpen,
    steps,
    topics,
    initialView,
    startTour,
  };
}
