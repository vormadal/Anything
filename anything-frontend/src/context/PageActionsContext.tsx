"use client";

import { createContext, useCallback, useContext, useState } from "react";

type PageActionsContextType = {
  headerActions: React.ReactNode;
  hideTitle: boolean;
  setHeaderActions: (actions: React.ReactNode, hideTitle?: boolean) => void;
};

const PageActionsContext = createContext<PageActionsContextType>({
  headerActions: null,
  hideTitle: false,
  setHeaderActions: () => {},
});

export function PageActionsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [headerActions, setHeaderActionsState] =
    useState<React.ReactNode>(null);
  const [hideTitle, setHideTitle] = useState(false);

  const setHeaderActions = useCallback(
    (actions: React.ReactNode, hide = false) => {
      setHeaderActionsState(actions);
      setHideTitle(hide);
    },
    [],
  );

  return (
    <PageActionsContext.Provider
      value={{ headerActions, hideTitle, setHeaderActions }}
    >
      {children}
    </PageActionsContext.Provider>
  );
}

export function useHeaderActions() {
  return useContext(PageActionsContext);
}
