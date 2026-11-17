"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * True while the home page is in edit (reorder/show-hide) mode. Cards read it
 * to keep their layout stable — the header action stays in place but invisible,
 * so the edit toolbar can sit exactly where it was — and to render something
 * draggable instead of `null` when they'd otherwise hide themselves.
 */
const HomeCardEditingContext = createContext(false);

export const HomeCardEditingProvider = HomeCardEditingContext.Provider;

export function useHomeCardEditing(): boolean {
  return useContext(HomeCardEditingContext);
}

/**
 * Wraps a home card's top-right header action. In edit mode the action keeps
 * its space (so the card doesn't change height) but is hidden: the
 * visibility switch and drag handle take its place.
 */
export function HomeCardAction({ children }: Readonly<{ children: ReactNode }>) {
  const editing = useHomeCardEditing();
  if (!editing) return <>{children}</>;
  return (
    <div className="invisible" aria-hidden="true">
      {children}
    </div>
  );
}
