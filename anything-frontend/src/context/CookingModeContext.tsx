"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { RecipeStep } from "@/lib/api-client/models/index";

export interface CookingSession {
  recipeId: number;
  recipeName: string;
  steps: RecipeStep[];
}

interface CookingModeContextValue {
  session: CookingSession | null;
  completedStepIds: Set<number>;
  startCooking: (session: CookingSession) => void;
  stopCooking: () => void;
  toggleStep: (stepId: number) => void;
}

const CookingModeContext = createContext<CookingModeContextValue>({
  session: null,
  completedStepIds: new Set(),
  startCooking: () => {},
  stopCooking: () => {},
  toggleStep: () => {},
});

export function useCookingMode() {
  return useContext(CookingModeContext);
}

export function CookingModeProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<CookingSession | null>(null);
  const [completedStepIds, setCompletedStepIds] = useState<Set<number>>(
    new Set(),
  );
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const acquireWakeLock = useCallback(async () => {
    if (typeof navigator !== "undefined" && "wakeLock" in navigator) {
      try {
        wakeLockRef.current = await navigator.wakeLock.request("screen");
      } catch {
        // Wake lock not available or denied – continue without it
      }
    }
  }, []);

  const releaseWakeLock = useCallback(() => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release().catch(() => {});
      wakeLockRef.current = null;
    }
  }, []);

  // Re-acquire wake lock when the tab becomes visible again while cooking
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && session) {
        acquireWakeLock();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [session, acquireWakeLock]);

  const startCooking = useCallback(
    (newSession: CookingSession) => {
      setSession(newSession);
      setCompletedStepIds(new Set());
      acquireWakeLock();
    },
    [acquireWakeLock],
  );

  const stopCooking = useCallback(() => {
    setSession(null);
    setCompletedStepIds(new Set());
    releaseWakeLock();
  }, [releaseWakeLock]);

  const toggleStep = useCallback((stepId: number) => {
    setCompletedStepIds((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      return next;
    });
  }, []);

  return (
    <CookingModeContext.Provider
      value={{ session, completedStepIds, startCooking, stopCooking, toggleStep }}
    >
      {children}
    </CookingModeContext.Provider>
  );
}
