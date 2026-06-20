"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { toast } from "sonner";
import type { LeftAction } from "@/context/PageActionsContext";

export interface BackPressHandler {
  isActive: boolean;
  onBack: () => void;
}

interface UseBackInterceptorProps {
  handlers?: BackPressHandler[];
  leftAction: LeftAction;
}

export function useBackInterceptor({
  handlers = [],
  leftAction,
}: UseBackInterceptorProps) {
  const backPressedOnceRef = useRef(false);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastIdRef = useRef<string | number | undefined>(undefined);

  // Keep refs up-to-date after every render so the popstate handler always
  // reads current state without relying on stale closures from useEffect.
  // useLayoutEffect runs synchronously after the DOM commit, before paint, so
  // any event that fires after a repaint will see the latest values.
  const handlersRef = useRef(handlers);
  const leftActionTypeRef = useRef(leftAction.type);
  useLayoutEffect(() => {
    handlersRef.current = handlers;
    leftActionTypeRef.current = leftAction.type;
  });

  useEffect(() => {
    window.history.pushState({ appSentinel: true }, "");
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const activeHandler = handlersRef.current.find((h) => h.isActive);
      if (activeHandler) {
        activeHandler.onBack();
        window.history.pushState({ appSentinel: true }, "");
        return;
      }

      if (leftActionTypeRef.current === "back") {
        return;
      }

      if (backPressedOnceRef.current) {
        if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
        backPressedOnceRef.current = false;
        toast.dismiss(toastIdRef.current);
        return;
      }

      backPressedOnceRef.current = true;
      window.history.pushState({ appSentinel: true }, "");
      toastIdRef.current = toast("Press back again to exit", { duration: 2000 });

      exitTimerRef.current = setTimeout(() => {
        backPressedOnceRef.current = false;
      }, 2000);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []); // Stable listener — reads current state from refs
}
