"use client";

import { Button } from "@/components/ui/button";
import { PageTitle } from "@/components/PageTitle";
import { useCurrentUser, useUpdateProfile, useChangePassword, getUser } from "@/hooks/useAuth";
import { useState } from "react";
import { toast } from "sonner";
import { ApiError } from "@/lib/apiClient";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export default function ProfilePage() {
  const { data: user } = useCurrentUser();

  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();
  const isOnline = useOnlineStatus();

  const [name, setName] = useState(() => getUser()?.name ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nameError, setNameError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameError("");

    if (!name.trim()) {
      setNameError("Name cannot be empty");
      return;
    }

    try {
      await updateProfile.mutateAsync({ name: name.trim() });
      toast.success("Name updated successfully");
    } catch (err) {
      if (err instanceof ApiError && err.responseStatusCode === 400) {
        toast.error("Invalid name");
      } else {
        toast.error("Failed to update name");
      }
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters");
      return;
    }

    try {
      await changePassword.mutateAsync({ currentPassword, newPassword });
      toast.success("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      if (err instanceof ApiError && err.responseStatusCode === 400) {
        toast.error("Current password is incorrect");
      } else {
        toast.error("Failed to change password");
      }
    }
  };

  return (
    <div className="container mx-auto px-4 py-4 max-w-xl space-y-6">
      <PageTitle>Profile</PageTitle>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Profile
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Email</p>
        <p className="text-sm font-medium text-gray-900 dark:text-white mb-4">
          {user?.email}
        </p>

        <form onSubmit={handleUpdateName} className="space-y-4">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
              placeholder="Your name"
              required
            />
          </div>
          {nameError && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {nameError}
            </p>
          )}
          <Button
            type="submit"
            disabled={updateProfile.isPending || !isOnline}
            title={isOnline ? undefined : "Saving your name requires an internet connection"}
            className="w-full sm:w-auto"
          >
            {updateProfile.isPending ? "Saving..." : "Save Name"}
          </Button>
        </form>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Change Password
        </h2>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label
              htmlFor="currentPassword"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Current Password
            </label>
            <input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
              placeholder="Enter current password"
              required
            />
          </div>
          <div>
            <label
              htmlFor="newPassword"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              New Password
            </label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
              placeholder="Enter new password (min 8 characters)"
              required
            />
          </div>
          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Confirm New Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
              placeholder="Confirm new password"
              required
            />
          </div>
          {passwordError && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {passwordError}
            </p>
          )}
          <Button
            type="submit"
            disabled={changePassword.isPending || !isOnline}
            title={isOnline ? undefined : "Changing your password requires an internet connection"}
            className="w-full sm:w-auto"
          >
            {changePassword.isPending ? "Changing..." : "Change Password"}
          </Button>
        </form>
      </div>
    </div>
  );
}
