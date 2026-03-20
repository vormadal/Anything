"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="antialiased">
        <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-gray-50 dark:bg-gray-900">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-md w-full">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Application Error
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm">
              The application encountered a critical error. Please reload the page.
            </p>
            <button
              onClick={reset}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium"
            >
              Reload
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
