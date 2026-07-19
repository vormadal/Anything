"use client";

import { Button } from "@/components/ui/button";
import { useLogin } from "@/hooks/useAuth";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useLogin();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!email || !password) {
      setFormError("Please enter both email and password");
      return;
    }

    try {
      await login.mutateAsync({ email, password });
      const redirect = searchParams.get("redirect");
      router.push(redirect ?? "/");
    } catch (err) {
      const error = err as Error;
      setFormError(error.message || "Login failed");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          placeholder="Enter your email"
          required
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          placeholder="Enter your password"
          required
        />
      </div>

      {formError && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {formError}
        </p>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={login.isPending}
      >
        {login.isPending ? "Signing in..." : "Sign In"}
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 text-center">
          Welcome to Anything
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mb-8 text-center">
          Sign in to continue
        </p>

        <Suspense fallback={<div className="space-y-4 animate-pulse"><div className="h-10 bg-gray-200 dark:bg-gray-700 rounded" /><div className="h-10 bg-gray-200 dark:bg-gray-700 rounded" /><div className="h-10 bg-gray-200 dark:bg-gray-700 rounded" /></div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
