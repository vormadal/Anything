"use client";

import { useLayoutEffect, useEffect, useRef } from "react";

export interface BackPressHandler {
  isActive: boolean;
  onBack: () => void;
}

interface UseBackInterceptorProps {
  handlers?: BackPressHandler[];
}

const SENTINEL = { backInterceptorSentinel: true };

/**
 * Intercepts the device/browser back button while any provided handler is
 * active (e.g. a navigation drawer is open). When the back button is pressed:
 *   - if a handler is active: call its onBack() instead of navigating
 *   - otherwise: let the browser navigate normally
 *
 * A sentinel history entry is pushed when a handler becomes active so that
 * the browser's back gesture targets the sentinel (not the previous page).
 * The sentinel is cleaned up when the handler deactivates via UI.
 */
export function useBackInterceptor({
  handlers = [],
}: UseBackInterceptorProps = {}) {
  const handlersRef = useRef(handlers);
  useLayoutEffect(() => {
    handlersRef.current = handlers;
  });

  const sentinelActiveRef = useRef(false);
  const suppressNextPopstateRef = useRef(false);
  const wasAnyActiveRef = useRef(false);

  const isAnyActive = handlers.some((h) => h.isActive);

  useEffect(() => {
    const wasActive = wasAnyActiveRef.current;
    wasAnyActiveRef.current = isAnyActive;

    if (isAnyActive && !wasActive) {
      window.history.pushState(SENTINEL, "");
      sentinelActiveRef.current = true;
    } else if (!isAnyActive && wasActive && sentinelActiveRef.current) {
      suppressNextPopstateRef.current = true;
      sentinelActiveRef.current = false;
      window.history.back();
    }
  }, [isAnyActive]);

  useEffect(() => {
    const handlePopState = () => {
      if (suppressNextPopstateRef.current) {
        suppressNextPopstateRef.current = false;
        return;
      }
      const activeHandler = handlersRef.current.find((h) => h.isActive);
      if (activeHandler) {
        sentinelActiveRef.current = false;
        activeHandler.onBack();
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);
}
