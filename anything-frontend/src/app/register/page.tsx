"use client";

import { Button } from "@/components/ui/button";
import { useRegister, useAcceptHouseholdInvite, getAccessToken } from "@/hooks/useAuth";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { toast } from "sonner";

function RegisterForm() {
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("token") || "";
  const isLoggedIn = !!getAccessToken();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [formError, setFormError] = useState("");
  const router = useRouter();
  const register = useRegister();
  const acceptInvite = useAcceptHouseholdInvite();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!email || !password || !name || !inviteToken) {
      setFormError("Please fill in all fields");
      return;
    }

    if (password.length < 8) {
      setFormError("Password must be at least 8 characters");
      return;
    }

    try {
      await register.mutateAsync({
        email,
        password,
        name,
        inviteToken,
      });
      toast.success("Registration successful! Please login.");
      router.push("/login");
    } catch (err) {
      const error = err as Error;
      setFormError(error.message || "Registration failed");
    }
  };

  if (!inviteToken) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 w-full max-w-md text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Invalid Invite
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            No invite token found. Please use the invite link sent to you.
          </p>
          <Button onClick={() => router.push("/login")}>
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  if (isLoggedIn) {
    const handleAccept = async () => {
      try {
        await acceptInvite.mutateAsync(inviteToken);
        toast.success("You have joined the household!");
        router.push("/households");
      } catch (err) {
        const error = err as Error;
        toast.error(error.message || "Failed to accept invite");
      }
    };

    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 w-full max-w-md text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Household Invitation
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-8">
            You&apos;ve been invited to join a household. Click Accept to add it to your account.
          </p>
          <div className="space-y-3">
            <Button
              className="w-full"
              onClick={handleAccept}
              disabled={acceptInvite.isPending}
            >
              {acceptInvite.isPending ? "Joining..." : "Accept Invitation"}
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => router.push("/households")}
            >
              Go to Households
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 text-center">
          Create Account
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mb-8 text-center">
          Complete your registration
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Full Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="John Doe"
              required
            />
          </div>

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
              placeholder="john@example.com"
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
              placeholder="Minimum 8 characters"
              required
              minLength={8}
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
            disabled={register.isPending}
          >
            {register.isPending ? "Creating account..." : "Create Account"}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => router.push("/login")}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Already have an account? Sign in
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RegisterForm />
    </Suspense>
  );
}
