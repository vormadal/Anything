"use client";

import { useCurrentUser, useLogout } from "@/hooks/useAuth";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { isAdmin } from "@/lib/roles";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Menu,
  ArrowLeft,
  Home,
  LayoutList,
  CookingPot,
  Shield,
  LogOut,
  UserPlus,
  CalendarDays,
  Receipt,
  Users,
  HelpCircle,
  Search,
  NotebookPen,
  Package,
} from "lucide-react";
import {
  PageActionsProvider,
  useHeaderActions,
} from "@/context/PageActionsContext";
import { CookingModeProvider } from "@/context/CookingModeContext";
import { CookingModeDrawer } from "@/components/CookingModeDrawer";
import { useSmartBack } from "@/hooks/useSmartBack";
import { useIsAuthenticated } from "@/hooks/useAuth";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { OfflineBanner } from "@/components/OfflineBanner";
import { useOnboardingTour } from "@/hooks/useOnboardingTour";
import { OnboardingTourDialog } from "@/components/OnboardingTourDialog";

const PUBLIC_PATHS = ["/login", "/register", "/shared"];


const NAV_ITEMS = [
  { label: "Home", path: "/", icon: Home },
  { label: "Lists", path: "/lists", icon: LayoutList },
  { label: "Notes", path: "/notes", icon: NotebookPen },
  { label: "Recipes", path: "/recipes", icon: CookingPot },
  { label: "Food Plan", path: "/food-plans", icon: CalendarDays },
  { label: "Bills", path: "/bills", icon: Receipt },
  { label: "Storage", path: "/inventory", icon: Package },
  { label: "Households", path: "/households", icon: Users },
];

const ADMIN_NAV_ITEMS = [
  { label: "Invite Users", path: "/admin/invite", icon: UserPlus },
  { label: "Search Index", path: "/admin/search-index", icon: Search },
];

const NAV_ACTIVE_CLASS =
  "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white";
const NAV_INACTIVE_CLASS =
  "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white";


export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (isPublicPath) {
    return <>{children}</>;
  }

  return (
    <PageActionsProvider>
      <CookingModeProvider>
        <AppLayoutInner>{children}</AppLayoutInner>
      </CookingModeProvider>
    </PageActionsProvider>
  );
}

function AppLayoutInner({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { data: user } = useCurrentUser();
  const logout = useLogout();
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useIsAuthenticated();
  const { headerActions, hideTitle, leftAction, title } = useHeaderActions();
  const { navigateBack } = useSmartBack();
  useOfflineSync();
  const tour = useOnboardingTour();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return null;
  }

  const navigate = (path: string) => {
    setDrawerOpen(false);
    router.push(path);
  };

  const handleLogout = async () => {
    setDrawerOpen(false);
    await logout.mutateAsync();
    router.push("/login");
  };

  const isActive = (path: string) =>
    pathname === path || (path !== "/" && pathname.startsWith(path));

  return (
    // A flex column so a page can claim the space the header leaves with `grow`
    // (the note editor does) instead of guessing at a `calc(100dvh - …)` — the
    // header is 57px, not the 56px its h-14 suggests, thanks to its border.
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 print:block print:bg-none">
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 print:hidden">
        <div className="flex items-center h-14 px-4">
          {leftAction.type === "back" ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigateBack(leftAction.href)}
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
          {!hideTitle && (
            <h1 className="ml-3 text-lg font-semibold text-gray-900 dark:text-white truncate flex-1">
              {title || "Anything"}
            </h1>
          )}
          {headerActions}
        </div>
      </header>

      <div className="print:hidden">
        <OfflineBanner />
      </div>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="left" className="w-72 flex flex-col p-0">
          <SheetHeader className="px-6 pt-6 pb-2">
            <SheetTitle className="text-xl">Anything</SheetTitle>
            <SheetDescription className="sr-only">
              Navigation menu
            </SheetDescription>
          </SheetHeader>

          <nav className="flex-1 px-3 py-2 space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive(item.path) ? NAV_ACTIVE_CLASS : NAV_INACTIVE_CLASS
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {item.label}
                </button>
              );
            })}

            {user && isAdmin(user.role) && (
              <div className="pt-3">
                <p className="flex items-center gap-2 px-3 pb-1 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  <Shield className="h-3.5 w-3.5" />
                  Admin
                </p>
                {ADMIN_NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.path}
                      onClick={() => navigate(item.path)}
                      className={`flex items-center gap-3 w-full pl-6 pr-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive(item.path)
                          ? NAV_ACTIVE_CLASS
                          : NAV_INACTIVE_CLASS
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            )}

            <button
              onClick={() => {
                setDrawerOpen(false);
                tour.startTour();
              }}
              className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${NAV_INACTIVE_CLASS}`}
            >
              <HelpCircle className="h-5 w-5 shrink-0" />
              Take the tour
            </button>
          </nav>

          <div className="border-t border-gray-200 dark:border-gray-800 p-4">
            {user && (
              <button
                onClick={() => navigate("/profile")}
                className="mb-3 px-1 w-full text-left rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors py-1"
              >
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {user.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {user.email}
                </p>
              </button>
            )}
            <button
              onClick={handleLogout}
              disabled={logout.isPending}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
            >
              <LogOut className="h-4 w-4" />
              {logout.isPending ? "Logging out..." : "Log out"}
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <main className="flex grow flex-col print:block">{children}</main>
      <CookingModeDrawer />
      <OnboardingTourDialog
        open={tour.open}
        onOpenChange={tour.setOpen}
        steps={tour.steps}
        topics={tour.topics}
        initialView={tour.initialView}
      />
    </div>
  );
}
