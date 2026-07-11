import type { LucideIcon } from "lucide-react";
import {
  CalendarDays,
  CookingPot,
  Crown,
  Home,
  LayoutList,
  Receipt,
  Settings,
  Shield,
  Users,
} from "lucide-react";
import { canManageHousehold, isAdmin, isHouseholdOwner } from "@/lib/roles";

export interface TourVisibilityContext {
  /** The current user's role in the selected household (Owner/Admin/Member). */
  householdRole: string | undefined;
  /** The current user's global role (Admin/User). */
  userRole: string | undefined;
}

export interface TourStep {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  /** Route for the optional "Take me there" button. */
  route?: string;
  /** Omitted means the step is visible to everyone. */
  isVisible?: (ctx: TourVisibilityContext) => boolean;
}

export const TOUR_SEEN_KEY = "tourSeenVersion";
// Bump when the tour content changes enough that users should see it again.
export const TOUR_VERSION = "1";

export function hasSeenTour(): boolean {
  // SSR: report "seen" so the tour never auto-opens during server rendering.
  if (typeof window === "undefined") return true;
  return localStorage.getItem(TOUR_SEEN_KEY) === TOUR_VERSION;
}

export function markTourSeen(): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(TOUR_SEEN_KEY, TOUR_VERSION);
  }
}

const HOUSEHOLDS_ROUTE = "/households";

export const TOUR_STEPS: TourStep[] = [
  {
    id: "home",
    icon: Home,
    title: "Welcome to Anything",
    description:
      "Your home page gives you an overview at a glance: today's meals, your lists, and upcoming bills. You can customize which cards appear and in what order from the settings gear on the home page.",
    route: "/",
  },
  {
    id: "lists",
    icon: LayoutList,
    title: "Lists",
    description:
      "Create checklists and shopping lists for anything — groceries, packing, chores. Lists are shared with everyone in your household and keep working even when you're offline.",
    route: "/lists",
  },
  {
    id: "recipes",
    icon: CookingPot,
    title: "Recipes",
    description:
      "Save your household's recipes with ingredients and instructions. Send a recipe's ingredients straight to a shopping list, or share a recipe with friends via a link.",
    route: "/recipes",
  },
  {
    id: "food-plan",
    icon: CalendarDays,
    title: "Food Plan",
    description:
      "Plan your meals for the week ahead. Smart suggestions rank your recipes by rotation, favorites, and season, so deciding what's for dinner takes seconds.",
    route: "/food-plans",
  },
  {
    id: "bills",
    icon: Receipt,
    title: "Bills",
    description:
      "Keep track of recurring bills and see what's due each month, so nothing slips through the cracks.",
    route: "/bills",
  },
  {
    id: "households",
    icon: Users,
    title: "Households",
    description:
      "Everything you create belongs to a household and is shared with its members. If you're part of several households, you can switch between them or accept new invitations here.",
    route: HOUSEHOLDS_ROUTE,
  },
  {
    id: "manage-household",
    icon: Settings,
    title: "Manage your household",
    description:
      "As a household manager you can invite new members and configure how things work: measurement units, recipe tags, and list suggestions. Find it all on your household's page.",
    route: HOUSEHOLDS_ROUTE,
    isVisible: (ctx) => canManageHousehold(ctx.householdRole),
  },
  {
    id: "owner",
    icon: Crown,
    title: "Owner tools",
    description:
      "As the household owner you can also rename or delete the household, change member roles, and transfer ownership from the household page.",
    route: HOUSEHOLDS_ROUTE,
    isVisible: (ctx) => isHouseholdOwner(ctx.householdRole),
  },
  {
    id: "admin",
    icon: Shield,
    title: "App administration",
    description:
      "As an app administrator you can invite new users to Anything from the Admin section in the menu.",
    route: "/admin/invite",
    isVisible: (ctx) => isAdmin(ctx.userRole),
  },
];

export function getVisibleTourSteps(ctx: TourVisibilityContext): TourStep[] {
  return TOUR_STEPS.filter((step) => step.isVisible?.(ctx) ?? true);
}
