import type { Metadata, Viewport } from "next";
import "./globals.css";
import { QueryProvider } from "@/context/QueryProvider";
import { Toaster } from "@/components/ui/sonner";
import { AuthGuard } from "@/components/AuthGuard";
import { HouseholdProvider } from "@/context/HouseholdContext";
import { AppLayout } from "@/components/AppLayout";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { PointerEventsReset } from "@/components/PointerEventsReset";

export const metadata: Metadata = {
  title: "Anything App",
  description: "Create anything you want - todos, lists, inventory, and more",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Anything App",
  },
  icons: {
    apple: "/icons/apple-icon-180.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <QueryProvider>
          <AuthGuard>
            <HouseholdProvider>
              <AppLayout>{children}</AppLayout>
            </HouseholdProvider>
          </AuthGuard>
        </QueryProvider>
        <Toaster />
        <PointerEventsReset />
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
