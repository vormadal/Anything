"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { HOUSEHOLD_ID_KEY } from "@/lib/apiClient";
import { useHouseholds, type Household } from "@/hooks/useHouseholds";

interface HouseholdContextValue {
  selectedHouseholdId: number | null;
  setSelectedHouseholdId: (id: number) => void;
  households: Household[];
  isLoading: boolean;
}

const HouseholdContext = createContext<HouseholdContextValue>({
  selectedHouseholdId: null,
  setSelectedHouseholdId: () => {},
  households: [],
  isLoading: true,
});

export function useHouseholdContext() {
  return useContext(HouseholdContext);
}

function getStoredHouseholdId(): number | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(HOUSEHOLD_ID_KEY);
  return stored ? Number(stored) : null;
}

function persistHouseholdId(id: number): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(HOUSEHOLD_ID_KEY, String(id));
  }
}

export function HouseholdProvider({ children }: { children: ReactNode }) {
  const { data: households = [], isLoading } = useHouseholds();
  const [selectedId, setSelectedId] = useState<number | null>(
    getStoredHouseholdId
  );

  const setSelectedHouseholdId = useCallback((id: number) => {
    setSelectedId(id);
    persistHouseholdId(id);
  }, []);

  // Derive the effective household ID: use stored selection if valid,
  // otherwise fall back to the first household.
  const effectiveId = useMemo(() => {
    if (isLoading || households.length === 0) return selectedId;

    const isValid = selectedId !== null && households.some((h) => h.id === selectedId);
    return isValid ? selectedId : households[0].id;
  }, [selectedId, households, isLoading]);

  // Persist the effective ID to localStorage whenever it changes (side effect outside render).
  useEffect(() => {
    if (effectiveId !== null) {
      persistHouseholdId(effectiveId);
    }
  }, [effectiveId]);

  return (
    <HouseholdContext.Provider
      value={{
        selectedHouseholdId: effectiveId,
        setSelectedHouseholdId,
        households,
        isLoading,
      }}
    >
      {children}
    </HouseholdContext.Provider>
  );
}
