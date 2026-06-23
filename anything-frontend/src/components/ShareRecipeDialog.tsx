"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check, Copy, Link, Mail, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  useRecipeShares,
  useCreateRecipeShare,
  useRevokeRecipeShare,
  type ShareExpiry,
  type RecipeShareResponse,
} from "@/hooks/useRecipeShares";

const EXPIRY_OPTIONS: { label: string; value: ShareExpiry }[] = [
  { label: "1 week", value: "OneWeek" },
  { label: "1 month", value: "OneMonth" },
  { label: "No expiry", value: "Forever" },
];

const FRONTEND_BASE_URL =
  typeof window !== "undefined"
    ? window.location.origin
    : process.env.NEXT_PUBLIC_FRONTEND_URL ?? "";

function buildFullUrl(shareUrl: string): string {
  return `${FRONTEND_BASE_URL}${shareUrl}`;
}

function formatExpiry(expiresAt: string | null): string {
  if (!expiresAt) return "No expiry";
  const d = new Date(expiresAt);
  return `Expires ${d.toLocaleDateString()}`;
}

interface CopyButtonProps {
  text: string;
}

function CopyButton({ text }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="shrink-0 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      aria-label="Copy link"
    >
      {copied ? (
        <Check className="h-4 w-4 text-green-500" />
      ) : (
        <Copy className="h-4 w-4 text-gray-500" />
      )}
    </button>
  );
}

interface ShareListItemProps {
  share: RecipeShareResponse;
  onRevoke: () => void;
  isRevoking: boolean;
}

function ShareListItem({ share, onRevoke, isRevoking }: ShareListItemProps) {
  const fullUrl = buildFullUrl(share.shareUrl);
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate text-gray-800 dark:text-gray-200">
          {share.targetEmail ?? "Public link"}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {share.isClaimed ? "Claimed · " : ""}
          {formatExpiry(share.expiresAt)}
          {share.isExpired ? " · Expired" : ""}
        </p>
      </div>
      <CopyButton text={fullUrl} />
      <button
        type="button"
        onClick={onRevoke}
        disabled={isRevoking}
        className="shrink-0 p-2 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        aria-label="Revoke share link"
      >
        <Trash2 className="h-4 w-4 text-red-500" />
      </button>
    </div>
  );
}

interface ExpiryPickerProps {
  value: ShareExpiry;
  onChange: (v: ShareExpiry) => void;
}

function ExpiryPicker({ value, onChange }: ExpiryPickerProps) {
  return (
    <div className="flex gap-2">
      {EXPIRY_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`flex-1 py-1.5 px-2 rounded-lg text-sm border transition-colors ${
            value === opt.value
              ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-500"
              : "border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500"
          }`}
          aria-pressed={value === opt.value}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

type TabId = "public" | "user";

interface Props {
  recipeId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareRecipeDialog({ recipeId, open, onOpenChange }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("public");
  const [publicExpiry, setPublicExpiry] = useState<ShareExpiry>("OneWeek");
  const [userEmail, setUserEmail] = useState("");
  const [userExpiry, setUserExpiry] = useState<ShareExpiry>("OneWeek");
  const [newShareUrl, setNewShareUrl] = useState<string | null>(null);

  const { data: shares = [] } = useRecipeShares(recipeId);
  const createShare = useCreateRecipeShare(recipeId);
  const revokeShare = useRevokeRecipeShare(recipeId);

  const publicShares = shares.filter((s) => s.targetEmail === null);
  const userShares = shares.filter((s) => s.targetEmail !== null);

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    setNewShareUrl(null);
  };

  const handleCreatePublicLink = async () => {
    try {
      const res = await createShare.mutateAsync({ expiry: publicExpiry, targetEmail: null });
      setNewShareUrl(buildFullUrl(res.shareUrl));
    } catch {
      toast.error("Failed to create share link. Please try again.");
    }
  };

  const handleCreateUserLink = async () => {
    if (!userEmail.trim()) return;
    try {
      const res = await createShare.mutateAsync({ expiry: userExpiry, targetEmail: userEmail.trim() });
      setNewShareUrl(buildFullUrl(res.shareUrl));
      setUserEmail("");
    } catch {
      toast.error("Failed to create share link. Please try again.");
    }
  };

  const handleRevoke = async (tokenId: number) => {
    try {
      await revokeShare.mutateAsync(tokenId);
      toast.success("Share link revoked");
    } catch {
      toast.error("Failed to revoke link. Please try again.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setNewShareUrl(null); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share recipe</DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={() => handleTabChange("public")}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "public"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            <Link className="h-4 w-4" />
            Public link
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("user")}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "user"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            <Mail className="h-4 w-4" />
            Share with user
          </button>
        </div>

        {activeTab === "public" && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Anyone with the link can view this recipe.
            </p>
            <ExpiryPicker value={publicExpiry} onChange={setPublicExpiry} />
            <Button
              onClick={handleCreatePublicLink}
              disabled={createShare.isPending}
              className="w-full"
            >
              Generate link
            </Button>

            {newShareUrl && activeTab === "public" && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <input
                  readOnly
                  value={newShareUrl}
                  className="flex-1 min-w-0 text-sm bg-transparent text-blue-800 dark:text-blue-300 outline-none"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  aria-label="Generated share link"
                />
                <CopyButton text={newShareUrl} />
              </div>
            )}

            {publicShares.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Active links
                </p>
                {publicShares.map((s) => (
                  <ShareListItem
                    key={s.id}
                    share={s}
                    onRevoke={() => handleRevoke(s.id)}
                    isRevoking={revokeShare.isPending}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "user" && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              The recipient will be able to clone this recipe to their household. They must have an account.
            </p>
            <input
              type="email"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              placeholder="Enter email address"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Recipient email address"
              onKeyDown={(e) => { if (e.key === "Enter") void handleCreateUserLink(); }}
            />
            <ExpiryPicker value={userExpiry} onChange={setUserExpiry} />
            <Button
              onClick={handleCreateUserLink}
              disabled={createShare.isPending || !userEmail.trim()}
              className="w-full"
            >
              Generate link
            </Button>

            {newShareUrl && activeTab === "user" && (
              <div className="space-y-1">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Copy this link and send it to the recipient:
                </p>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                  <input
                    readOnly
                    value={newShareUrl}
                    className="flex-1 min-w-0 text-sm bg-transparent text-blue-800 dark:text-blue-300 outline-none"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                    aria-label="Generated share link"
                  />
                  <CopyButton text={newShareUrl} />
                </div>
              </div>
            )}

            {userShares.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Active links
                </p>
                {userShares.map((s) => (
                  <ShareListItem
                    key={s.id}
                    share={s}
                    onRevoke={() => handleRevoke(s.id)}
                    isRevoking={revokeShare.isPending}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
