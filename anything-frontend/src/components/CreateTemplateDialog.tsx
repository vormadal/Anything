"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ListChecks, ShoppingCart } from "lucide-react";
import { useCreateShoppingList } from "@/hooks/useShoppingLists";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { toast } from "sonner";

type Mode = "checklist" | "shopping";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (templateId: number) => void;
}

const MODE_OPTIONS: { mode: Mode; label: string; icon: typeof ListChecks }[] = [
  { mode: "checklist", label: "Checklist", icon: ListChecks },
  { mode: "shopping", label: "Shopping list", icon: ShoppingCart },
];

export function CreateTemplateDialog({ open, onOpenChange, onCreated }: Props) {
  const [mode, setMode] = useState<Mode>("checklist");
  const [name, setName] = useState("");

  const createList = useCreateShoppingList();
  const isOnline = useOnlineStatus();

  // Reset the form on close so the next open starts fresh (without a state-syncing effect)
  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setMode("checklist");
      setName("");
    }
    onOpenChange(next);
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    try {
      const newTemplate = await createList.mutateAsync({
        name: name.trim(),
        type: mode === "checklist" ? 0 : 1,
        isTemplate: true,
      });
      handleOpenChange(false);
      if (newTemplate?.id) onCreated(newTemplate.id);
    } catch {
      toast.error("Failed to create template. Please try again.");
    }
  };

  const canSubmit = name.trim().length > 0 && isOnline;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a template</DialogTitle>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {MODE_OPTIONS.map(({ mode: value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                aria-pressed={mode === value}
                className={`flex flex-col items-center gap-1.5 rounded-lg border px-2 py-3 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  mode === value
                    ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200"
                    : "border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700/50"
                }`}
              >
                <Icon className="h-5 w-5" />
                {label}
              </button>
            ))}
          </div>

          <input
            type="text"
            value={name}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && canSubmit) handleCreate();
            }}
            placeholder="Template name..."
            aria-label="Template name"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>

        <DialogFooter className="gap-2 mt-6">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!canSubmit || createList.isPending}
            title={isOnline ? undefined : "Creating a template requires an internet connection"}
          >
            {createList.isPending ? "Creating..." : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
