"use client";

import { useEffect } from "react";
import { useHeaderActions } from "@/context/PageActionsContext";

export function PageTitle({ children }: { children: string }) {
  const { setPageTitle } = useHeaderActions();

  useEffect(() => {
    setPageTitle(children);
    return () => setPageTitle("");
  }, [children, setPageTitle]);

  return null;
}
