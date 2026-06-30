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
import { ListChecks, ShoppingCart, LayoutTemplate } from "lucide-react";
import {
  useCreateShoppingList,
  useCreateFromTemplate,
  useShoppingListTemplates,
} from "@/hooks/useShoppingLists";
import { toast } from "sonner";

type Mode = "checklist" | "shopping" | "template";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (listId: number) => void;
}

const MODE_OPTIONS: { mode: Mode; label: string; icon: typeof ListChecks }[] = [
  { mode: "checklist", label: "Checklist", icon: ListChecks },
  { mode: "shopping", label: "Shopping list", icon: ShoppingCart },
  { mode: "template", label: "From template", icon: LayoutTemplate },
];

export function CreateListDialog({ open, onOpenChange, onCreated }: Props) {
  const [mode, setMode] = useState<Mode>("checklist");
  const [name, setName] = useState("");
  const [templateId, setTemplateId] = useState<number | null>(null);

  const createList = useCreateShoppingList();
  const createFromTemplate = useCreateFromTemplate();
  const { data: templates, isLoading: templatesLoading } = useShoppingListTemplates(open);

  const isPending = createList.isPending || createFromTemplate.isPending;

  // Reset the form on close so the next open starts fresh (without a state-syncing effect)
  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setMode("checklist");
      setName("");
      setTemplateId(null);
    }
    onOpenChange(next);
  };

  const handleSelectTemplate = (id: number, templateName: string) => {
    setTemplateId(id);
    if (!name.trim()) setName(templateName);
  };

  const handleCreate = async () => {
    try {
      if (mode === "template") {
        if (templateId === null) return;
        const newList = await createFromTemplate.mutateAsync({
          templateId,
          name: name.trim() || null,
        });
        toast.success("List created from template");
        handleOpenChange(false);
        if (newList?.id) onCreated(newList.id);
        return;
      }

      if (!name.trim()) return;
      const newList = await createList.mutateAsync({
        name: name.trim(),
        type: mode === "checklist" ? 0 : 1,
      });
      toast.success(mode === "checklist" ? "Checklist created" : "Shopping list created");
      handleOpenChange(false);
      if (newList?.id) onCreated(newList.id);
    } catch {
      toast.error("Failed to create list. Please try again.");
    }
  };

  const canSubmit = mode === "template" ? templateId !== null : name.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a list</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-2">
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

        {mode === "template" ? (
          <div className="space-y-3">
            <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700">
              {templatesLoading && (
                <div className="px-3 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                  Loading templates...
                </div>
              )}
              {!templatesLoading && templates?.length === 0 && (
                <div className="px-3 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                  No templates yet. Save a list as a template first.
                </div>
              )}
              {templates?.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => handleSelectTemplate(template.id ?? 0, template.name ?? "")}
                  aria-pressed={templateId === template.id}
                  className={`flex w-full items-center justify-between px-3 py-2.5 text-left text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 ${
                    templateId === template.id
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200"
                      : "text-gray-900 hover:bg-gray-50 dark:text-white dark:hover:bg-gray-700/50"
                  }`}
                >
                  <span className="font-medium">{template.name}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {template.itemCount} {template.itemCount === 1 ? "item" : "items"}
                  </span>
                </button>
              ))}
            </div>
            {templateId !== null && (
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="List name..."
                aria-label="List name"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            )}
          </div>
        ) : (
          <input
            type="text"
            value={name}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && canSubmit) handleCreate();
            }}
            placeholder="List name..."
            aria-label="List name"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!canSubmit || isPending}>
            {isPending ? "Creating..." : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
