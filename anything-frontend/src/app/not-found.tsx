import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">404</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        This page could not be found.
      </p>
      <Button asChild variant="outline">
        <Link href="/">Go home</Link>
      </Button>
    </div>
  );
}
