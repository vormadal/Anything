"use client";

import { useLayoutEffect, useRef } from "react";

const FLIP_DURATION_MS = 250;

/**
 * FLIP-animates the direct children of the returned container ref whenever
 * their position on screen changes between renders — e.g. a checked item
 * jumping to the top of the checked group instead of just appearing there.
 *
 * A child opts in with a stable `data-flip-id` attribute (the item's id);
 * children without one are ignored, so header/divider rows can sit alongside
 * animated ones.
 *
 * Runs on every commit rather than off a dependency array — reading
 * `getBoundingClientRect()` for a checklist's handful of rows is cheap, and
 * this way any reorder is caught regardless of what triggered it (a toggle,
 * an add/remove, a background refetch).
 *
 * Uses the Web Animations API directly instead of toggling CSS transitions,
 * so there's no transition-then-clear dance to force a reflow between the
 * "jump" and "settle" steps. Browsers without `Element.animate` — and jsdom,
 * which has neither `animate` nor real layout — just skip the animation; the
 * reorder itself is unaffected.
 */
export function useFlipAnimation<T extends HTMLElement>() {
  const containerRef = useRef<T>(null);
  const previousTopsRef = useRef(new Map<string, number>());

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const previousTops = previousTopsRef.current;
    const nextTops = new Map<string, number>();

    for (const child of Array.from(container.children)) {
      if (!(child instanceof HTMLElement)) continue;
      const flipId = child.dataset.flipId;
      if (!flipId) continue;

      const newTop = child.getBoundingClientRect().top;
      nextTops.set(flipId, newTop);

      const previousTop = previousTops.get(flipId);
      const delta = previousTop == null ? 0 : previousTop - newTop;
      if (delta !== 0 && typeof child.animate === "function") {
        child.animate(
          [{ transform: `translateY(${delta}px)` }, { transform: "translateY(0)" }],
          { duration: FLIP_DURATION_MS, easing: "ease" }
        );
      }
    }

    previousTopsRef.current = nextTops;
  });

  return containerRef;
}
