"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { toast } from "sonner";

export interface BackPressHandler {
  isActive: boolean;
  onBack: () => void;
}

interface UseBackInterceptorProps {
  handlers?: BackPressHandler[];
  /**
   * Whether the user is currently on the app's home/root page. The
   * "press back again to exit" guard only applies here. On every other page
   * (list overviews, detail pages, etc.) the browser's back navigation is
   * allowed to proceed normally so the user simply returns to the previous
   * page (and ultimately to home).
   */
  isRoot: boolean;
}

const EXIT_PROMPT = "Press back again to exit";
const EXIT_WINDOW_MS = 2000;

interface SentinelState {
  appSentinel?: boolean;
}

function isSentinel(state: unknown): boolean {
  return (state as SentinelState | null)?.appSentinel === true;
}

function pushSentinel() {
  window.history.pushState({ appSentinel: true }, "");
}

export function useBackInterceptor({
  handlers = [],
  isRoot,
}: UseBackInterceptorProps) {
  const backPressedOnceRef = useRef(false);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastIdRef = useRef<string | number | undefined>(undefined);

  // Keep refs up-to-date after every render so the popstate handler always
  // reads current state without relying on stale closures. useLayoutEffect runs
  // synchronously after the DOM commit, before paint, so any back press that
  // fires after a repaint sees the latest values.
  const handlersRef = useRef(handlers);
  const isRootRef = useRef(isRoot);
  useLayoutEffect(() => {
    handlersRef.current = handlers;
    isRootRef.current = isRoot;
  });

  // Keep a sentinel history entry on top whenever the home page is shown, so
  // the first back press while on home is absorbed (prompting to exit) instead
  // of immediately leaving the app. Re-runs whenever we (re-)enter home.
  useEffect(() => {
    if (isRoot && !isSentinel(window.history.state)) {
      pushSentinel();
    }
  }, [isRoot]);

  useEffect(() => {
    const handlePopState = () => {
      // 1. An active overlay (e.g. the navigation drawer) takes priority:
      //    close it and re-arm the sentinel so the app is not left.
      const activeHandler = handlersRef.current.find((h) => h.isActive);
      if (activeHandler) {
        activeHandler.onBack();
        pushSentinel();
        return;
      }

      // 2. We landed back on the sentinel entry — this happens when navigating
      //    into home from a deeper page. Leave it as the armed exit guard and
      //    do not prompt; the user just wanted to reach home.
      if (isSentinel(window.history.state)) {
        return;
      }

      // 3. Not on the home page — allow normal browser back navigation so the
      //    user returns to the previous page (and eventually to home).
      if (!isRootRef.current) {
        return;
      }

      // 4. On the home page, the user backed off the sentinel onto the real
      //    home entry — apply the "press back again to exit" guard.
      if (backPressedOnceRef.current) {
        if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
        backPressedOnceRef.current = false;
        toast.dismiss(toastIdRef.current);
        return;
      }

      backPressedOnceRef.current = true;
      pushSentinel();
      toastIdRef.current = toast(EXIT_PROMPT, { duration: EXIT_WINDOW_MS });

      exitTimerRef.current = setTimeout(() => {
        backPressedOnceRef.current = false;
      }, EXIT_WINDOW_MS);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []); // Stable listener — reads current state from refs
}
