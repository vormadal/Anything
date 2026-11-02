"use client";

import type { ReactNode } from "react";
import type { RenovationMaterialResponse } from "@/lib/api-client/models/index";
import { formatKr } from "@/lib/renovation";
import { categoryOf, isProductLinked } from "./materialsView";

interface MaterialListItemProps {
  material: RenovationMaterialResponse;
  expanded: boolean;
  onToggle: () => void;
  /** The inline edit form, rendered under the row while expanded. */
  children?: ReactNode;
}

function metaText(material: RenovationMaterialResponse): string {
  const waste = material.wastePercent ?? 0;
  return waste > 0 ? `${categoryOf(material)} · +${waste}% waste` : categoryOf(material);
}

function priceText(material: RenovationMaterialResponse): string {
  if (material.defaultPrice === null || material.defaultPrice === undefined) return "No price";
  const unit = material.unit ? `/${material.unit}` : "";
  return `${formatKr(material.defaultPrice)}${unit}`;
}

export function MaterialListItem({ material, expanded, onToggle, children }: MaterialListItemProps) {
  const linked = isProductLinked(material);

  return (
    <li className="border-t border-gray-100 first:border-t-0 dark:border-gray-700">
      <button
        type="button"
        aria-expanded={expanded}
        onClick={onToggle}
        className="flex min-h-[60px] w-full items-center gap-3 bg-white px-4 py-2.5 text-left text-gray-900 hover:bg-gray-50 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-sm font-semibold">{material.name}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">{metaText(material)}</span>
        </span>
        <span className="flex flex-col items-end gap-0.5 whitespace-nowrap">
          <span className="text-sm font-semibold">{priceText(material)}</span>
          <span
            className={
              linked
                ? "text-xs font-medium text-blue-700 dark:text-blue-400"
                : "text-xs text-gray-500 dark:text-gray-400"
            }
          >
            {linked ? "Product linked" : "No link"}
          </span>
        </span>
      </button>
      {expanded && children}
    </li>
  );
}
