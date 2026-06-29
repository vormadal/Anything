"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";

export interface BackPressHandler {
  isActive: boolean;
  onBack: () => void;
}

interface UseBackInterceptorProps {
  handlers?: BackPressHandler[];
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

/**
 * Guards the app against being exited by the device/browser back button without
 * confirmation, while still allowing back to navigate normally between in-app
 * pages.
 *
 * A single "sentinel" history entry is placed above the page the app was opened
 * on (its entry point). While there are in-app pages to go back to, a back press
 * navigates between them as usual. Once the user has unwound back to the entry
 * point — i.e. the next back would leave the app entirely — the
 * "press back again to exit" prompt is shown instead, regardless of which page
 * the app was opened on (so a directly-opened deep link is guarded too). A
 * second back press within {@link EXIT_WINDOW_MS} lets the app close.
 */
export function useBackInterceptor({
  handlers = [],
}: UseBackInterceptorProps = {}) {
  const pathname = usePathname();

  const backPressedOnceRef = useRef(false);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastIdRef = useRef<string | number | undefined>(undefined);
  // Whether the current history position is the sentinel sitting directly above
  // the app's entry point — i.e. the next back press would exit the app.
  const atFloorRef = useRef(true);

  // Keep handlers fresh for the stable popstate listener. useLayoutEffect runs
  // synchronously after the DOM commit so a back press always sees current refs.
  const handlersRef = useRef(handlers);
  useLayoutEffect(() => {
    handlersRef.current = handlers;
  });

  // Place the sentinel buffer above the entry point once, on mount.
  useEffect(() => {
    pushSentinel();
    atFloorRef.current = true;
  }, []);

  // After every (non-back) route change the current entry is a real in-app
  // page, so we are no longer sitting on the floor sentinel. Re-derive the flag
  // from the actual history state (which Next.js preserves our marker on).
  useEffect(() => {
    atFloorRef.current = isSentinel(window.history.state);
  }, [pathname]);

  useEffect(() => {
    const handlePopState = () => {
      // 1. An active overlay (e.g. the navigation drawer) takes priority: close
      //    it and restore the sentinel buffer so the app is not left.
      const activeHandler = handlersRef.current.find((h) => h.isActive);
      if (activeHandler) {
        activeHandler.onBack();
        pushSentinel();
        atFloorRef.current = true;
        return;
      }

      // 2. We landed back on the sentinel — the user has unwound their in-app
      //    navigation and is now at the entry point. Arm the exit guard but do
      //    not prompt yet; the next back is the one that would exit.
      if (isSentinel(window.history.state)) {
        atFloorRef.current = true;
        return;
      }

      // 3. We are not at the floor, so this is ordinary back navigation between
      //    in-app pages — let the browser proceed.
      if (!atFloorRef.current) {
        return;
      }

      // 4. We popped the sentinel off the entry point — the next pop would exit
      //    the app. Show the "press back again to exit" prompt and re-arm.
      if (backPressedOnceRef.current) {
        if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
        backPressedOnceRef.current = false;
        toast.dismiss(toastIdRef.current);
        atFloorRef.current = false; // let the following back press exit
        return;
      }

      backPressedOnceRef.current = true;
      pushSentinel();
      atFloorRef.current = true;
      toastIdRef.current = toast(EXIT_PROMPT, { duration: EXIT_WINDOW_MS });

      exitTimerRef.current = setTimeout(() => {
        backPressedOnceRef.current = false;
      }, EXIT_WINDOW_MS);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []); // Stable listener — reads current state from refs
}
