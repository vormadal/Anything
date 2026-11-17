"use client";

import { useEffect, useId, useRef } from "react";
import { useHeaderActions, type PageAction } from "@/context/PageActionsContext";

/** Everything about an action that changes what's rendered, minus its callback. */
function signatureOf(actions: PageAction[]): string {
  return actions
    .map((a) => [a.label, a.href ?? "", a.disabled ? 1 : 0, a.disabledReason ?? "", a.primary ? 1 : 0, a.icon.displayName ?? ""].join("|"))
    .join(";");
}

/**
 * Shows `actions` in the floating action button for as long as the calling
 * component is mounted. Pass `[]` to show none.
 *
 * Callers may pass a fresh array (and fresh `onSelect` closures) every render:
 * the actions are only re-registered when something visible changes, and the
 * registered callbacks always call the latest closure. That is what lets a
 * page write `onSelect: () => setOpen(true)` inline without the ref dance the
 * header-actions effects need.
 */
export function usePageActions(actions: PageAction[]) {
  const source = useId();
  const { registerPageActions } = useHeaderActions();
  const latest = useRef(actions);
  useEffect(() => {
    latest.current = actions;
  });

  const signature = signatureOf(actions);

  useEffect(() => {
    registerPageActions(
      source,
      latest.current.map((action) => ({
        ...action,
        onSelect: action.onSelect
          ? () => latest.current.find((a) => a.label === action.label)?.onSelect?.()
          : undefined,
      })),
    );
  }, [registerPageActions, signature, source]);

  useEffect(() => () => registerPageActions(source, null), [registerPageActions, source]);
}
