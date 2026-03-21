"use client";

import { createContext, useCallback, useContext, useState } from "react";

export type LeftAction = { type: "menu" } | { type: "back"; href: string };

type PageActionsContextType = {
  headerActions: React.ReactNode;
  hideTitle: boolean;
  leftAction: LeftAction;
  title: string;
  setHeaderActions: (actions: React.ReactNode, hideTitle?: boolean) => void;
  setLeftAction: (action: LeftAction) => void;
  setPageTitle: (title: string) => void;
};

const PageActionsContext = createContext<PageActionsContextType>({
  headerActions: null,
  hideTitle: false,
  leftAction: { type: "menu" },
  title: "",
  setHeaderActions: () => {},
  setLeftAction: () => {},
  setPageTitle: () => {},
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

  return (
    <PageActionsContext.Provider
      value={{
        headerActions,
        hideTitle,
        leftAction,
        title,
        setHeaderActions,
        setLeftAction,
        setPageTitle,
      }}
    >
      {children}
    </PageActionsContext.Provider>
  );
}

export function useHeaderActions() {
  return useContext(PageActionsContext);
}
