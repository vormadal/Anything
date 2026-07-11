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
  /** The tour topic (area) this step belongs to. */
  topicId: string;
  icon: LucideIcon;
  title: string;
  description: string;
  /** Route for the optional "Take me there" button. */
  route?: string;
  /** Omitted means the step is visible to everyone. */
  isVisible?: (ctx: TourVisibilityContext) => boolean;
}

export interface TourTopic {
  id: string;
  label: string;
  icon: LucideIcon;
  description: string;
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
const HOUSEHOLD_TOPIC = "household";

export const TOUR_TOPICS: TourTopic[] = [
  {
    id: "home",
    label: "Home",
    icon: Home,
    description: "Your daily overview",
  },
  {
    id: "lists",
    label: "Lists",
    icon: LayoutList,
    description: "Checklists & shopping lists",
  },
  {
    id: "recipes",
    label: "Recipes",
    icon: CookingPot,
    description: "Your recipe collection",
  },
  {
    id: "food-plan",
    label: "Food Plan",
    icon: CalendarDays,
    description: "Weekly meal planning",
  },
  {
    id: "bills",
    label: "Bills",
    icon: Receipt,
    description: "Recurring bills",
  },
  {
    id: HOUSEHOLD_TOPIC,
    label: "Household",
    icon: Users,
    description: "Sharing, members & settings",
  },
  {
    id: "admin",
    label: "Administration",
    icon: Shield,
    description: "App-level administration",
  },
];

export const TOUR_STEPS: TourStep[] = [
  {
    id: "home",
    topicId: "home",
    icon: Home,
    title: "Welcome to Anything",
    description:
      "Your home page gives you an overview at a glance: today's meals, your lists, and upcoming bills. You can customize which cards appear and in what order from the settings gear on the home page.",
    route: "/",
  },
  {
    id: "lists",
    topicId: "lists",
    icon: LayoutList,
    title: "Lists",
    description:
      "Create checklists and shopping lists for anything — groceries, packing, chores. Lists are shared with everyone in your household and keep working even when you're offline.",
    route: "/lists",
  },
  {
    id: "recipes",
    topicId: "recipes",
    icon: CookingPot,
    title: "Recipes",
    description:
      "Save your household's recipes with ingredients and instructions. Send a recipe's ingredients straight to a shopping list, or share a recipe with friends via a link.",
    route: "/recipes",
  },
  {
    id: "food-plan",
    topicId: "food-plan",
    icon: CalendarDays,
    title: "Food Plan",
    description:
      "Plan your meals for the week ahead. Smart suggestions rank your recipes by rotation, favorites, and season, so deciding what's for dinner takes seconds.",
    route: "/food-plans",
  },
  {
    id: "bills",
    topicId: "bills",
    icon: Receipt,
    title: "Bills",
    description:
      "Keep track of recurring bills and see what's due each month, so nothing slips through the cracks.",
    route: "/bills",
  },
  {
    id: "households",
    topicId: HOUSEHOLD_TOPIC,
    icon: Users,
    title: "Households",
    description:
      "Everything you create belongs to a household and is shared with its members. If you're part of several households, you can switch between them or accept new invitations here.",
    route: HOUSEHOLDS_ROUTE,
  },
  {
    id: "manage-household",
    topicId: HOUSEHOLD_TOPIC,
    icon: Settings,
    title: "Manage your household",
    description:
      "As a household manager you can invite new members and configure how things work: measurement units, recipe tags, and list suggestions. Find it all on your household's page.",
    route: HOUSEHOLDS_ROUTE,
    isVisible: (ctx) => canManageHousehold(ctx.householdRole),
  },
  {
    id: "owner",
    topicId: HOUSEHOLD_TOPIC,
    icon: Crown,
    title: "Owner tools",
    description:
      "As the household owner you can also rename or delete the household, change member roles, and transfer ownership from the household page.",
    route: HOUSEHOLDS_ROUTE,
    isVisible: (ctx) => isHouseholdOwner(ctx.householdRole),
  },
  {
    id: "admin",
    topicId: "admin",
    icon: Shield,
    title: "App administration",
    description:
      "As an app administrator you can invite new users to Anything from the Admin section in the menu.",
    route: "/admin/invite",
    isVisible: (ctx) => isAdmin(ctx.userRole),
  },
];

export function getVisibleTourSteps(
  ctx: TourVisibilityContext,
  topicId?: string
): TourStep[] {
  return TOUR_STEPS.filter(
    (step) =>
      (step.isVisible?.(ctx) ?? true) &&
      (topicId === undefined || step.topicId === topicId)
  );
}

// Topics with at least one visible step for the given roles.
export function getVisibleTourTopics(ctx: TourVisibilityContext): TourTopic[] {
  const visibleTopicIds = new Set(
    getVisibleTourSteps(ctx).map((step) => step.topicId)
  );
  return TOUR_TOPICS.filter((topic) => visibleTopicIds.has(topic.id));
}
