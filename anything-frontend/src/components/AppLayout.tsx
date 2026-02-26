"use client";

import { useCurrentUser, useLogout } from "@/hooks/useAuth";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { isAdmin } from "@/lib/roles";
import { toast } from "sonner";
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
  Home,
  ShoppingCart,
  CookingPot,
  Shield,
  LogOut,
} from "lucide-react";
import {
  PageActionsProvider,
  useHeaderActions,
} from "@/context/PageActionsContext";

const PUBLIC_PATHS = ["/login", "/register"];

const NAV_ITEMS = [
  { label: "Home", path: "/", icon: Home },
  { label: "Shopping Lists", path: "/shopping-lists", icon: ShoppingCart },
  { label: "Recipes", path: "/recipes", icon: CookingPot },
];

function getPageTitle(pathname: string): string {
  if (pathname === "/") return "Anything";
  if (pathname === "/shopping-lists") return "Shopping Lists";
  if (pathname.startsWith("/shopping-lists/")) return "Shopping List";
  if (pathname === "/recipes") return "Recipes";
  if (pathname === "/recipes/new") return "New Recipe";
  if (pathname.startsWith("/recipes/")) return "Recipe";
  if (pathname === "/admin") return "Admin";
  return "Anything";
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (isPublicPath) {
    return <>{children}</>;
  }

  return (
    <PageActionsProvider>
      <AppLayoutInner>{children}</AppLayoutInner>
    </PageActionsProvider>
  );
}

function AppLayoutInner({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { data: user } = useCurrentUser();
  const logout = useLogout();
  const router = useRouter();
  const pathname = usePathname();
  const { headerActions, hideTitle } = useHeaderActions();

  const navigate = (path: string) => {
    setDrawerOpen(false);
    router.push(path);
  };

  const handleLogout = async () => {
    setDrawerOpen(false);
    await logout.mutateAsync();
    toast.success("Logged out successfully");
    router.push("/login");
  };

  const isActive = (path: string) =>
    pathname === path || (path !== "/" && pathname.startsWith(path));

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center h-14 px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          {!hideTitle && (
            <h1 className="ml-3 text-lg font-semibold text-gray-900 dark:text-white truncate flex-1">
              {getPageTitle(pathname)}
            </h1>
          )}
          {headerActions}
        </div>
      </header>

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
                    isActive(item.path)
                      ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {item.label}
                </button>
              );
            })}

            {user && isAdmin(user.role) && (
              <button
                onClick={() => navigate("/admin")}
                className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive("/admin")
                    ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                <Shield className="h-5 w-5 shrink-0" />
                Admin
              </button>
            )}
          </nav>

          <div className="border-t border-gray-200 dark:border-gray-800 p-4">
            {user && (
              <div className="mb-3 px-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {user.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {user.email}
                </p>
              </div>
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

      <main>{children}</main>
    </div>
  );
}
