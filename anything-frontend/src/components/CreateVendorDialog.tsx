"use client";

import { useState } from "react";
import { useCreateVendor, type Vendor } from "@/hooks/useVendors";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

interface CreateVendorDialogProps {
  initialName: string;
  onCreated: (vendor: Vendor) => void;
  onCancel: () => void;
}

export function CreateVendorDialog({
  initialName,
  onCreated,
  onCancel,
}: CreateVendorDialogProps) {
  const [name, setName] = useState(initialName);
  const [website, setWebsite] = useState("");
  const createVendor = useCreateVendor();
  const isOnline = useOnlineStatus();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      const result = await createVendor.mutateAsync({
        name: name.trim(),
        website: website.trim() || undefined,
      }) as unknown as Vendor;
      toast.success("Vendor created");
      onCreated(result);
    } catch {
      toast.error("Failed to create vendor");
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New vendor</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Website
            </label>
            <input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={createVendor.isPending || !name.trim() || !isOnline}
              title={isOnline ? undefined : "Creating a vendor requires an internet connection"}
            >
              {createVendor.isPending ? "Creating..." : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
