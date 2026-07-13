"use client";

import { useIsAuthenticated } from "@/hooks/useAuth";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { useIsRestoring } from "@tanstack/react-query";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  // useSyncExternalStore is the recommended SSR-safe hydration check:
  // getServerSnapshot returns false (server), getSnapshot returns true (client).
  const isHydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const isAuthenticated = useIsAuthenticated();
  // The offline query cache restores from IndexedDB asynchronously (see
  // QueryProvider's PersistQueryClientProvider). Holding the loading state
  // until it finishes means HouseholdProvider and every page below it always
  // mount with the persisted cache already hydrated, instead of racing it and
  // rendering an empty state on a cold, offline app open.
  const isRestoring = useIsRestoring();
  useRealtimeSync();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isHydrated) return;

    const publicPaths = ["/login", "/register", "/shared"];
    const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));

    if (!isAuthenticated && !isPublicPath) {
      router.push("/login");
    }
  }, [isHydrated, isAuthenticated, pathname, router]);

  const isRedirecting = useRef(false);

  // Redirect to login with current path when a 401 is detected (token expired)
  useEffect(() => {
    const handleUnauthorized = () => {
      if (isRedirecting.current) return;
      const publicPaths = ["/login", "/register", "/shared"];
      const isPublicPath = publicPaths.some((path) =>
        pathname.startsWith(path)
      );
      if (!isPublicPath) {
        isRedirecting.current = true;
        router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      }
    };

    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () => {
      window.removeEventListener("auth:unauthorized", handleUnauthorized);
    };
  }, [pathname, router]);

  const isPublicPath = pathname === "/login" || pathname.startsWith("/register") || pathname.startsWith("/shared");

  // Show loading while hydrating, while the offline cache restores, or while
  // redirecting unauthenticated users
  if (!isHydrated || isRestoring || (!isAuthenticated && !isPublicPath)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
