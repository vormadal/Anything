import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "@/context/QueryProvider";
import { Toaster } from "@/components/ui/sonner";
import { AuthGuard } from "@/components/AuthGuard";
import { AppLayout } from "@/components/AppLayout";

export const metadata: Metadata = {
  title: "Anything App",
  description: "Create anything you want - todos, lists, inventory, and more",
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
            <AppLayout>{children}</AppLayout>
          </AuthGuard>
        </QueryProvider>
        <Toaster />
      </body>
    </html>
  );
}
