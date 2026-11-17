"use client";

import { Fragment } from "react";
import Link from "next/link";
import { MoreVertical, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const DESTRUCTIVE_ITEM_CLASS =
  "text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/20";

export type HeaderMenuItem = {
  label: string;
  icon: LucideIcon;
  href?: string;
  onSelect?: () => void;
  disabled?: boolean;
  /** Rendered red, after a separator. Keep destructive items last. */
  destructive?: boolean;
};

/**
 * The header's ⋮ menu for secondary actions — rename, settings, share,
 * delete. Primary actions belong in the floating action button
 * (`usePageActions`), not here. Pass it to `setHeaderActions`.
 */
export function HeaderMenu({ items }: { items: HeaderMenuItem[] }) {
  if (items.length === 0) return null;
  const firstDestructive = items.findIndex((item) => item.destructive);

  return (
    <div className="ml-auto flex items-center">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="More options">
            <MoreVertical className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {items.map((item, index) => {
            const Icon = item.icon;
            const content = (
              <>
                <Icon className="h-4 w-4" />
                {item.label}
              </>
            );
            return (
              <Fragment key={item.label}>
                {index === firstDestructive && index > 0 && <DropdownMenuSeparator />}
                <DropdownMenuItem
                  asChild={!!item.href && !item.disabled}
                  disabled={item.disabled}
                  onSelect={item.onSelect}
                  className={item.destructive ? DESTRUCTIVE_ITEM_CLASS : undefined}
                >
                  {item.href && !item.disabled ? <Link href={item.href}>{content}</Link> : content}
                </DropdownMenuItem>
              </Fragment>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
