"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

function DialogOverlay({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      className={[
        "fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}

const PANEL_CLASS =
  "fixed left-1/2 top-1/2 z-50 w-full max-w-md max-h-[90vh] overflow-y-auto -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white dark:bg-gray-800 p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95";

/**
 * Header/body/footer layout: a column whose body scrolls while the header and footer stay put.
 * Phones get a full-height sheet; from `sm` up it is the same centred card as PANEL_CLASS.
 * Deliberately shares no base utilities with PANEL_CLASS (`p-6`, `overflow-y-auto`, `max-h-*`),
 * so no class has to win a conflict by stylesheet order.
 */
const PINNED_PANEL_CLASS =
  "fixed inset-0 z-50 flex flex-col overflow-hidden bg-white dark:bg-gray-800 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:max-h-[90vh] sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-lg";

const FULL_SCREEN_CLASS =
  "fixed inset-0 z-50 flex flex-col bg-black duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0";

interface DialogContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  /**
   * Edge-to-edge panel with no card chrome and no built-in close button, for content
   * that owns the whole viewport (the inventory photo viewer). A `className` override
   * can't do this: the panel classes and any override carry the same specificity, so
   * which one wins depends on Tailwind's stylesheet order, not on prop order.
   */
  fullScreen?: boolean;
  /**
   * Pinned header and footer with a scrolling body in between. The caller supplies the three
   * parts: a `shrink-0` header, a `min-h-0 flex-1 overflow-y-auto` body and a `shrink-0` footer,
   * and adds its own padding (the panel has none). Ignored when `fullScreen` is set.
   */
  pinned?: boolean;
}

function panelClass(fullScreen: boolean | undefined, pinned: boolean | undefined): string {
  if (fullScreen) return FULL_SCREEN_CLASS;
  return pinned ? PINNED_PANEL_CLASS : PANEL_CLASS;
}

function DialogContent({ className, children, fullScreen, pinned, ...props }: DialogContentProps) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        className={[panelClass(fullScreen, pinned), className]
          .filter(Boolean)
          .join(" ")}
        {...props}
      >
        {children}
        {!fullScreen && (
          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-gray-400">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={["flex flex-col space-y-1.5 text-center sm:text-left", className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}

function DialogTitle({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={["text-lg font-semibold leading-none tracking-tight text-gray-900 dark:text-white", className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={["flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-4", className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
};
