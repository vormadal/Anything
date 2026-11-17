"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useHeaderActions, type PageAction } from "@/context/PageActionsContext";
import { useCookingDrawerVisible } from "@/hooks/useCookingDrawerVisible";

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const FAB_SURFACE =
  "rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50";

/**
 * The page's floating action button, bottom right. Pages declare actions with
 * `usePageActions`; this renders them:
 *
 * - none → nothing;
 * - one  → a labelled pill (nothing to expand, so the label shows directly);
 * - more → a round + that expands into a vertical stack of labelled buttons,
 *   the first action nearest the thumb.
 *
 * Rendered once, by `AppLayout`.
 */
export function FloatingActions() {
  const { pageActions } = useHeaderActions();
  const liftForDrawer = useCookingDrawerVisible();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close on navigation by adjusting state during render rather than in an effect.
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setOpen(false);
  }
  // Nothing left to expand (e.g. a list entered edit mode): don't come back open.
  if (open && pageActions.length < 2) {
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (pageActions.length === 0) return null;

  // The cooking-mode bar spans the bottom of every other page; sit above it.
  const style = {
    bottom: `calc(${liftForDrawer ? "6rem" : "1rem"} + env(safe-area-inset-bottom, 0px))`,
    right: "calc(1rem + env(safe-area-inset-right, 0px))",
  };

  if (pageActions.length === 1) {
    const [action] = pageActions;
    const Icon = action.icon;
    return (
      <div className="fixed z-40 print:hidden" style={style}>
        <ActionControl
          action={action}
          className={cn("flex h-14 items-center gap-2 pl-4 pr-5 text-sm font-semibold", FAB_SURFACE, FOCUS_RING)}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
          {action.label}
        </ActionControl>
      </div>
    );
  }

  return (
    <>
      {open && (
        <div
          aria-hidden="true"
          data-testid="page-actions-scrim"
          className="animate-in fade-in-0 fixed inset-0 z-40 bg-gray-950/40 motion-reduce:animate-none print:hidden"
          onClick={() => setOpen(false)}
        />
      )}
      <div className="fixed z-40 flex flex-col items-end gap-3 print:hidden" style={style}>
        {open && (
          // Reversed so the first action ends up nearest the + button.
          <div id="page-actions-menu" className="flex flex-col-reverse items-end gap-3">
            {pageActions.map((action) => (
              <DialItem key={action.label} action={action} onDone={() => setOpen(false)} />
            ))}
          </div>
        )}
        <button
          ref={triggerRef}
          type="button"
          aria-label="Page actions"
          aria-expanded={open}
          aria-controls={open ? "page-actions-menu" : undefined}
          onClick={() => setOpen((o) => !o)}
          className={cn("grid h-14 w-14 place-items-center", FAB_SURFACE, FOCUS_RING)}
        >
          <Plus
            className={cn("h-6 w-6 transition-transform motion-reduce:transition-none", open && "rotate-45")}
            aria-hidden="true"
          />
        </button>
      </div>
    </>
  );
}

function DialItem({ action, onDone }: { action: PageAction; onDone: () => void }) {
  const Icon = action.icon;
  return (
    <ActionControl
      action={action}
      onDone={onDone}
      className={cn(
        "animate-in fade-in-0 slide-in-from-bottom-2 group flex items-center gap-3 rounded-full motion-reduce:animate-none disabled:pointer-events-none disabled:opacity-60",
        FOCUS_RING,
      )}
    >
      <span className="rounded bg-white px-2.5 py-1.5 text-sm font-medium text-gray-900 shadow-md dark:bg-gray-800 dark:text-gray-100">
        {action.label}
      </span>
      <span
        className={cn(
          "mr-1.5 grid h-11 w-11 place-items-center rounded-full shadow-md",
          action.primary
            ? "bg-coral text-white"
            : "bg-white text-blue-800 group-hover:bg-gray-100 dark:bg-gray-800 dark:text-blue-300 dark:group-hover:bg-gray-700",
        )}
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
    </ActionControl>
  );
}

/** A link for `href` actions, a button otherwise — so navigation stays a real link. */
function ActionControl({
  action,
  className,
  onDone,
  children,
}: {
  action: PageAction;
  className: string;
  onDone?: () => void;
  children: React.ReactNode;
}) {
  if (action.href && !action.disabled) {
    return (
      <Link href={action.href} className={className} onClick={onDone}>
        {children}
      </Link>
    );
  }
  return (
    <button
      type="button"
      className={className}
      disabled={action.disabled}
      title={action.disabled ? action.disabledReason : undefined}
      onClick={() => {
        onDone?.();
        action.onSelect?.();
      }}
    >
      {children}
    </button>
  );
}
