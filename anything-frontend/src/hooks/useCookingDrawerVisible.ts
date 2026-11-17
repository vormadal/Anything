"use client";

import { usePathname } from "next/navigation";
import { useCookingMode } from "@/context/CookingModeContext";

/**
 * Whether the cooking-mode bar is on screen: a session is running and the user
 * is on any page but that recipe's own. `CookingModeDrawer` renders on it, and
 * `FloatingActions` reads it to sit above the bar.
 */
export function useCookingDrawerVisible(): boolean {
  const { session } = useCookingMode();
  const pathname = usePathname();
  return !!session && pathname !== `/recipes/${session.recipeId}`;
}
