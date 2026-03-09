"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

/**
 * Returns a `navigateBack` function that prefers browser history-based back
 * navigation when the previous location is on the same domain, and falls back
 * to `router.push(fallbackHref)` otherwise.
 */
export function useSmartBack() {
  const router = useRouter();
  const pathname = usePathname();
  const visitedCountRef = useRef(0);

  useEffect(() => {
    visitedCountRef.current += 1;
  }, [pathname]);

  const navigateBack = useCallback(
    (fallbackHref: string) => {
      // If we've navigated to more than one route within this app session,
      // the previous history entry is guaranteed to be same-domain.
      if (visitedCountRef.current > 1) {
        router.back();
        return;
      }

      // For the first page in this session, check the browser referrer.
      if (typeof document !== "undefined" && document.referrer) {
        try {
          if (
            new URL(document.referrer).origin === window.location.origin
          ) {
            router.back();
            return;
          }
        } catch {
          // Malformed referrer — fall through to push
        }
      }

      router.push(fallbackHref);
    },
    [router],
  );

  return { navigateBack };
}
