"use client";

import { useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { PageTitle } from "@/components/PageTitle";
import { LoadErrorState } from "@/components/LoadErrorState";
import { useHeaderActions } from "@/context/PageActionsContext";
import {
  useSentNotifications,
  type SentNotificationResponse,
} from "@/hooks/useNotifications";
import { loadFailure } from "@/lib/queryState";

function formatWhen(sentOn: Date | null | undefined): string {
  if (!sentOn) return "";
  return formatDistanceToNow(sentOn, { addSuffix: true });
}

/**
 * "4 recipients · 2 read". The recipient count is every copy created, including
 * ones since dismissed — see the backend contract for why that never drops.
 */
function formatReach(recipients: number, readCount: number): string {
  const people = recipients === 1 ? "1 recipient" : `${recipients} recipients`;
  return `${people} · ${readCount} read`;
}

function SentRow({ sent }: { sent: SentNotificationResponse }) {
  return (
    <div className="px-4 py-3">
      <p className="text-sm font-medium text-gray-900 dark:text-white">
        {sent.title}
      </p>
      {sent.body && (
        <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-300">
          {sent.body}
        </p>
      )}
      <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
        {formatWhen(sent.sentOn)} · {formatReach(sent.recipients ?? 0, sent.readCount ?? 0)}
      </p>
    </div>
  );
}

/**
 * The announcements the signed-in user has sent, as sends rather than as the
 * per-recipient rows they became. Not gated on being a household manager: only
 * a manager can send, but someone demoted afterwards should still see what they
 * sent, and the endpoint returns nothing but their own history either way.
 */
export default function SentNotificationsPage() {
  const { setLeftAction } = useHeaderActions();
  const sentQuery = useSentNotifications();
  const { data: sent, isLoading } = sentQuery;
  const failure = loadFailure(sentQuery);

  useEffect(() => {
    setLeftAction({ type: "back", href: "/notifications" });
    return () => setLeftAction({ type: "menu" });
  }, [setLeftAction]);

  return (
    <div className="container mx-auto max-w-2xl space-y-4 px-4 py-4">
      <PageTitle>Sent announcements</PageTitle>

      {isLoading && !failure.failed && (
        <div className="py-12 text-center text-gray-500 dark:text-gray-400">
          Loading...
        </div>
      )}

      {failure.failed && (
        <LoadErrorState
          what="your sent announcements"
          onRetry={failure.retry}
          isRetrying={failure.isRetrying}
        />
      )}

      {!failure.failed && sent?.length === 0 && !isLoading && (
        <div className="py-12 text-center text-gray-500 dark:text-gray-400">
          You haven&apos;t sent any announcements yet.
        </div>
      )}

      {!failure.failed && sent && sent.length > 0 && (
        <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-800">
          {sent.map((item) => (
            <SentRow key={`${item.sentOn?.toISOString() ?? ""}-${item.title}`} sent={item} />
          ))}
        </div>
      )}
    </div>
  );
}
