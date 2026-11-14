"use client";

import { useLayoutEffect, useRef } from "react";

const FLIP_DURATION_MS = 250;

/**
 * The vertical translation an element is currently showing, read from its
 * computed transform (which includes any running Web Animation). Only the
 * `matrix(...)`/`matrix3d(...)` forms browsers serialize computed transforms
 * to are understood; anything else counts as no offset.
 */
function currentTranslateY(element: HTMLElement): number {
  const transform = getComputedStyle(element).transform;
  const values = /^matrix(3d)?\((.+)\)$/.exec(transform ?? "");
  if (!values) return 0;
  const parts = values[2].split(",").map(Number);
  const y = values[1] ? parts[13] : parts[5];
  return Number.isFinite(y) ? y : 0;
}

/** The container's direct children that opted in with a `data-flip-id`. */
function flipRows(container: HTMLElement): HTMLElement[] {
  return Array.from(container.children).filter(
    (child): child is HTMLElement => child instanceof HTMLElement && !!child.dataset.flipId
  );
}

function sameOrder(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((id, i) => id === b[i]);
}

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
 * A toggle reliably commits again *while* its slide is still running (the
 * mutation going pending/settled, the refetch landing), and
 * `getBoundingClientRect()` includes the in-flight transform. So positions
 * are tracked as layout positions (rect minus the running translation) and
 * relative to the container (so scrolling between commits isn't a "move"):
 * a commit that doesn't change a row's layout leaves its animation alone,
 * and one that does starts the new slide from where the row currently
 * *appears*. Treating the transformed rect as the row's position instead
 * restarts the slide from a mirrored offset — the row visibly jumps the wrong
 * way before settling.
 *
 * Only a commit that changes the rows' *order* (or which rows exist) slides
 * anything. A row can also shift without any reorder — text rewrapping after
 * a width change, a font or image settling, or the container having been
 * measured while detached from the document (all rects read as zero, so every
 * row would then slide in from the top as if just added). Those commits only
 * refresh the baseline. This matters most for lists embedded in a note, whose
 * node views re-render on nearly every editor transaction (#807).
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
  const animationsRef = useRef(new Map<string, Animation>());

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (!container.isConnected) {
      previousTopsRef.current = new Map();
      return;
    }

    const containerTop = container.getBoundingClientRect().top;
    const previousTops = previousTopsRef.current;
    const animations = animationsRef.current;
    const rows = flipRows(container);
    const reordered = !sameOrder(
      rows.map((row) => row.dataset.flipId!),
      Array.from(previousTops.keys())
    );
    const nextTops = new Map<string, number>();

    for (const child of rows) {
      const flipId = child.dataset.flipId!;
      const running = animations.get(flipId);
      const isRunning = running?.playState === "running";
      const offset = isRunning ? currentTranslateY(child) : 0;
      const layoutTop = child.getBoundingClientRect().top - containerTop - offset;
      nextTops.set(flipId, layoutTop);

      const previousTop = previousTops.get(flipId);
      if (!reordered || previousTop == null || Math.abs(previousTop - layoutTop) < 0.5) continue;
      if (typeof child.animate !== "function") continue;

      // Where the row appears right now, relative to where it will rest.
      const delta = previousTop + offset - layoutTop;
      if (isRunning) running.cancel();
      animations.set(
        flipId,
        child.animate(
          [{ transform: `translateY(${delta}px)` }, { transform: "translateY(0)" }],
          { duration: FLIP_DURATION_MS, easing: "ease" }
        )
      );
    }

    for (const flipId of animations.keys()) {
      if (!nextTops.has(flipId)) animations.delete(flipId);
    }
    previousTopsRef.current = nextTops;
  });

  return containerRef;
}
