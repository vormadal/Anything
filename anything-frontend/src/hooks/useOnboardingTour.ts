"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useCurrentUser, useIsAuthenticated } from "@/hooks/useAuth";
import { useHouseholdContext } from "@/context/HouseholdContext";
import {
  getVisibleTourSteps,
  hasSeenTour,
  markTourSeen,
} from "@/lib/tourSteps";

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

  const steps = useMemo(
    () =>
      getVisibleTourSteps({
        householdRole: currentHouseholdRole,
        userRole: user?.role,
      }),
    [currentHouseholdRole, user?.role]
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

  return { open: manuallyOpened || autoOpen, setOpen, steps, startTour };
}
