"use client";

import Link from "next/link";
import Image from "next/image";
import { ChevronRight } from "lucide-react";
import { CountBadge } from "@/components/ui/count-badge";

/** Bordered card that groups a set of `InventoryRow`s, matching the notes list. */
export function InventoryList({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
      {children}
    </div>
  );
}

interface InventoryRowProps {
  href: string;
  title: string;
  subtitle?: string | null;
  /** Shown as a blue pill on the right; hidden when zero. */
  count?: number;
  icon?: React.ReactNode;
  /** First photo of the entity; takes the leading slot in place of `icon` when present. */
  thumbnailUrl?: string | null;
}

export function InventoryRow({ href, title, subtitle, count, icon, thumbnailUrl }: InventoryRowProps) {
  return (
    <Link
      href={href}
      className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
    >
      <span className="flex items-center gap-3 min-w-0">
        {thumbnailUrl ? (
          <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-gray-100 dark:bg-gray-700">
            <Image src={thumbnailUrl} alt="" fill sizes="40px" className="object-cover" />
          </span>
        ) : (
          icon && <span className="text-gray-400 shrink-0">{icon}</span>
        )}
        <span className="min-w-0">
          <span className="block text-sm font-medium text-gray-900 dark:text-white truncate">
            {title}
          </span>
          {subtitle && (
            <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">
              {subtitle}
            </span>
          )}
        </span>
      </span>
      <span className="flex items-center gap-2 shrink-0">
        <CountBadge count={count} />
        <ChevronRight className="h-4 w-4 text-gray-400" />
      </span>
    </Link>
  );
}
