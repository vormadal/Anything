"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Safety net for a known Radix Dialog/AlertDialog issue: navigating while a modal
 * is mid-close can leave `pointer-events: none` stuck on <body>, freezing the UI
 * until reload (see issue #570). On every route change, any dialog from the prior
 * page has unmounted, so clearing a stuck value here is always safe.
 */
export function PointerEventsReset() {
  const pathname = usePathname();

  useEffect(() => {
    if (document.body.style.pointerEvents === "none") {
      document.body.style.pointerEvents = "";
    }
  }, [pathname]);

  return null;
}
