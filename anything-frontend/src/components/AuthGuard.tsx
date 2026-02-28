"use client";

import { useIsAuthenticated } from "@/hooks/useAuth";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [isHydrated, setIsHydrated] = useState(false);
  const isAuthenticated = useIsAuthenticated();
  const router = useRouter();
  const pathname = usePathname();

  // Wait for client-side hydration before making auth decisions.
  // During SSR, localStorage is unavailable so auth state can't be determined.
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    const publicPaths = ["/login", "/register"];
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
      const publicPaths = ["/login", "/register"];
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

  const isPublicPath = pathname === "/login" || pathname.startsWith("/register");

  // Show loading while hydrating or while redirecting unauthenticated users
  if (!isHydrated || (!isAuthenticated && !isPublicPath)) {
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
