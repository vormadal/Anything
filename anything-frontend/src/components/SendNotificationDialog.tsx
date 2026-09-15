"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useSendNotification } from "@/hooks/useNotifications";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TITLE_MAX_LENGTH = 200;
const BODY_MAX_LENGTH = 2000;

export function SendNotificationDialog({ open, onOpenChange }: Props) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const sendNotification = useSendNotification();
  const isOnline = useOnlineStatus();

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setTitle("");
      setBody("");
    }
    onOpenChange(next);
  };

  const canSubmit = title.trim().length > 0 && isOnline && !sendNotification.isPending;

  const handleSend = async () => {
    if (!canSubmit) return;
    try {
      const result = await sendNotification.mutateAsync({
        title: title.trim(),
        body: body.trim() || null,
      });
      handleOpenChange(false);
      // Worth a toast: the sender is excluded from their own announcement, so
      // nothing on their screen would otherwise change. The count is the useful
      // part — it excludes anyone who switched announcements off.
      const recipients = result.recipients ?? 0;
      toast.success(
        recipients === 1
          ? "Sent to 1 household member"
          : `Sent to ${recipients} household members`
      );
    } catch {
      toast.error("Failed to send the announcement. Please try again.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send an announcement</DialogTitle>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="announcement-title"
              className="text-sm font-medium text-gray-700 dark:text-gray-200"
            >
              Title
            </label>
            <input
              id="announcement-title"
              type="text"
              value={title}
              autoFocus
              required
              maxLength={TITLE_MAX_LENGTH}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Bin day moved to Thursday"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="announcement-body"
              className="text-sm font-medium text-gray-700 dark:text-gray-200"
            >
              Message <span className="text-gray-400 dark:text-gray-500">(optional)</span>
            </label>
            <textarea
              id="announcement-body"
              value={body}
              rows={3}
              maxLength={BODY_MAX_LENGTH}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Anything else the household should know."
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400">
            Everyone in the household gets this except you. Members who turned
            announcements off in their notification settings are skipped.
          </p>
        </div>

        <DialogFooter className="mt-6 gap-2">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={!canSubmit}
            title={isOnline ? undefined : "Sending an announcement requires an internet connection"}
          >
            {sendNotification.isPending ? "Sending..." : "Send"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
