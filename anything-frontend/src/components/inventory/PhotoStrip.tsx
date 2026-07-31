"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";

export interface StripPhoto {
  id: number;
  src: string;
  alt: string;
}

interface PhotoStripProps {
  photos: StripPhoto[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  /** `cover` fills the hero's fixed height; `contain` letterboxes in the fullscreen viewer. */
  fit: "cover" | "contain";
  sizes: string;
  /** When set, each slide becomes a button — used by the hero to open the viewer. */
  onPhotoClick?: (index: number) => void;
  className?: string;
}

/**
 * Horizontally swipeable photo strip built on CSS scroll-snap, shared by the inventory
 * hero gallery and its fullscreen viewer. Native scrolling gives touch swipe, trackpad
 * and scrollbar behaviour for free — no carousel dependency.
 */
export function PhotoStrip({
  photos,
  activeIndex,
  onActiveIndexChange,
  fit,
  sizes,
  onPhotoClick,
  className,
}: PhotoStripProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const hasScrolledRef = useRef(false);
  const scrollTargetRef = useRef<number | null>(null);

  // Keeps the strip in step with an index changed from outside (arrow buttons, keyboard).
  // The first run jumps without animating so the viewer opens on the tapped photo.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || typeof el.scrollTo !== "function") return;
    const width = el.clientWidth;
    if (width === 0) return;
    if (Math.round(el.scrollLeft / width) === activeIndex) return;
    scrollTargetRef.current = activeIndex;
    el.scrollTo({ left: activeIndex * width, behavior: hasScrolledRef.current ? "smooth" : "auto" });
    hasScrolledRef.current = true;
  }, [activeIndex]);

  function handleScroll() {
    const el = scrollerRef.current;
    if (!el) return;
    const width = el.clientWidth;
    if (width === 0) return;
    const index = Math.round(el.scrollLeft / width);

    // A smooth scroll we started ourselves passes over every slide in between. Reporting
    // those would set the index back to a slide we're scrolling away from, which in turn
    // re-targets the effect — jumping to photo 3 would stall on photo 2.
    if (scrollTargetRef.current !== null) {
      if (index === scrollTargetRef.current) scrollTargetRef.current = null;
      return;
    }

    if (index !== activeIndex && index >= 0 && index < photos.length) {
      hasScrolledRef.current = true;
      onActiveIndexChange(index);
    }
  }

  return (
    <div
      ref={scrollerRef}
      onScroll={handleScroll}
      // Grabbing the strip cancels the "ignore this scroll" guard, so a swipe that
      // interrupts a smooth scroll is still tracked.
      onPointerDown={() => { scrollTargetRef.current = null; }}
      className={["flex h-full w-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden", className]
        .filter(Boolean)
        .join(" ")}
      style={{ scrollbarWidth: "none" }}
    >
      {photos.map((photo, index) => {
        const image = (
          <Image
            src={photo.src}
            alt={photo.alt}
            fill
            sizes={sizes}
            className={fit === "cover" ? "object-cover" : "object-contain"}
          />
        );
        return (
          <div key={photo.id} className="relative h-full w-full shrink-0 snap-center">
            {onPhotoClick ? (
              <button
                type="button"
                onClick={() => onPhotoClick(index)}
                aria-label={`View ${photo.alt} full screen`}
                className="absolute inset-0 h-full w-full cursor-zoom-in"
              >
                {image}
              </button>
            ) : (
              image
            )}
          </div>
        );
      })}
    </div>
  );
}

interface PhotoIndicatorsProps {
  count: number;
  activeIndex: number;
  onSelect: (index: number) => void;
}

/** Dot row plus an `n / total` counter; renders nothing for a single photo. */
export function PhotoIndicators({ count, activeIndex, onSelect }: PhotoIndicatorsProps) {
  if (count < 2) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/60 to-transparent px-3 py-2">
      <div className="pointer-events-auto flex items-center gap-1.5">
        {Array.from({ length: count }, (_, index) => (
          <button
            key={index}
            type="button"
            onClick={() => onSelect(index)}
            aria-label={`Show photo ${index + 1}`}
            aria-current={index === activeIndex}
            className={[
              "h-1.5 rounded-full transition-all",
              index === activeIndex ? "w-4 bg-white" : "w-1.5 bg-white/50",
            ].join(" ")}
          />
        ))}
      </div>
      <span className="text-xs font-medium text-white tabular-nums">
        {activeIndex + 1} / {count}
      </span>
    </div>
  );
}
