"use client";

import { createContext, useCallback, useContext, useState } from "react";

export type LeftAction = { type: "menu" } | { type: "back"; href: string };

type PageActionsContextType = {
  headerActions: React.ReactNode;
  hideTitle: boolean;
  leftAction: LeftAction;
  setHeaderActions: (actions: React.ReactNode, hideTitle?: boolean) => void;
  setLeftAction: (action: LeftAction) => void;
};

const PageActionsContext = createContext<PageActionsContextType>({
  headerActions: null,
  hideTitle: false,
  leftAction: { type: "menu" },
  setHeaderActions: () => {},
  setLeftAction: () => {},
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

  return (
    <PageActionsContext.Provider
      value={{
        headerActions,
        hideTitle,
        leftAction,
        setHeaderActions,
        setLeftAction,
      }}
    >
      {children}
    </PageActionsContext.Provider>
  );
}

export function useHeaderActions() {
  return useContext(PageActionsContext);
}
