"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";

type LeftAction = { type: "menu" } | { type: "back"; href: string };

/**
 * One entry in the page's floating action button (bottom right).
 *
 * The FAB holds what a user does *with* the page's thing — create, add to,
 * complete, edit. What they do *to* it (rename, convert, share, settings,
 * delete) stays in the header's ⋮ menu via `setHeaderActions`.
 */
export type PageAction = {
  /** Visible label, and the accessible name of the control. Unique per page. */
  label: string;
  icon: LucideIcon;
  /** Navigates instead of calling `onSelect` when set. */
  href?: string;
  onSelect?: () => void;
  disabled?: boolean;
  /** Tooltip explaining why the action is disabled (e.g. offline). */
  disabledReason?: string;
  /**
   * Sorted first, i.e. nearest the thumb — for the action the page exists to
   * finish (Complete list). Also gets the accent colour in the expanded dial.
   */
  primary?: boolean;
};

type PageActionsContextType = {
  headerActions: React.ReactNode;
  hideTitle: boolean;
  leftAction: LeftAction;
  title: string;
  /** Every registered FAB action, merged across sources, primary ones first. */
  pageActions: PageAction[];
  setHeaderActions: (actions: React.ReactNode, hideTitle?: boolean) => void;
  setLeftAction: (action: LeftAction) => void;
  setPageTitle: (title: string) => void;
  /**
   * Registers one source's FAB actions (`null` removes it). Several sources can
   * contribute at once — a list page offers "Edit items" while its view offers
   * "Complete list" — so actions are keyed by source rather than replaced.
   * Prefer the `usePageActions` hook over calling this directly.
   */
  registerPageActions: (source: string, actions: PageAction[] | null) => void;
};

const PageActionsContext = createContext<PageActionsContextType>({
  headerActions: null,
  hideTitle: false,
  leftAction: { type: "menu" },
  title: "",
  pageActions: [],
  setHeaderActions: () => {},
  setLeftAction: () => {},
  setPageTitle: () => {},
  registerPageActions: () => {},
});

export function PageActionsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [headerActions, setHeaderActionsState] =
    useState<React.ReactNode>(null);
  const [hideTitle, setHideTitle] = useState(false);
  const [leftAction, setLeftActionState] = useState<LeftAction>({
    type: "menu",
  });
  const [title, setTitleState] = useState("");
  const [sources, setSources] = useState<Record<string, PageAction[]>>({});

  const setHeaderActions = useCallback(
    (actions: React.ReactNode, hide = false) => {
      setHeaderActionsState(actions);
      setHideTitle(hide);
    },
    [],
  );

  const setLeftAction = useCallback((action: LeftAction) => {
    setLeftActionState(action);
  }, []);

  const setPageTitle = useCallback((t: string) => {
    setTitleState(t);
  }, []);

  const registerPageActions = useCallback(
    (source: string, actions: PageAction[] | null) => {
      setSources((current) => {
        if (actions === null) {
          if (!(source in current)) return current;
          const next = { ...current };
          delete next[source];
          return next;
        }
        return { ...current, [source]: actions };
      });
    },
    [],
  );

  const pageActions = useMemo(() => {
    const all = Object.values(sources).flat();
    return [...all.filter((a) => a.primary), ...all.filter((a) => !a.primary)];
  }, [sources]);

  return (
    <PageActionsContext.Provider
      value={{
        headerActions,
        hideTitle,
        leftAction,
        title,
        pageActions,
        setHeaderActions,
        setLeftAction,
        setPageTitle,
        registerPageActions,
      }}
    >
      {children}
    </PageActionsContext.Provider>
  );
}

export function useHeaderActions() {
  return useContext(PageActionsContext);
}
