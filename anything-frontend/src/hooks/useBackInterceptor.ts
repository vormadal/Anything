"use client";

import { useEffect, useRef } from "react";
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

  useEffect(() => {
    window.history.pushState({ appSentinel: true }, "");
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const activeHandler = handlers.find((h) => h.isActive);
      if (activeHandler) {
        activeHandler.onBack();
        window.history.pushState({ appSentinel: true }, "");
        return;
      }

      if (leftAction.type === "back") {
        return;
      }

      if (backPressedOnceRef.current) {
        if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
        backPressedOnceRef.current = false;
        return;
      }

      backPressedOnceRef.current = true;
      window.history.pushState({ appSentinel: true }, "");
      toast("Press back again to exit", { duration: 2000 });

      exitTimerRef.current = setTimeout(() => {
        backPressedOnceRef.current = false;
      }, 2000);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [handlers, leftAction.type]);
}
