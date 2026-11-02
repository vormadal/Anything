"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { PageTitle } from "@/components/PageTitle";
import { LoadErrorState } from "@/components/LoadErrorState";
import { TemplateEditor } from "@/components/renovation/templates/TemplateEditor";
import { NewRoomTypeDialog } from "@/components/renovation/templates/NewRoomTypeDialog";
import { deriveSlug } from "@/components/renovation/templates/templateModel";
import { useHeaderActions } from "@/context/PageActionsContext";
import { useHouseholdContext } from "@/context/HouseholdContext";
import { loadFailure } from "@/lib/queryState";
import { canManageHousehold } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { useRenovationMaterials, useRenovationRoomTemplates } from "@/hooks/useRenovation";
import type { RenovationRoomTemplateResponse } from "@/lib/api-client/models/index";

const TEMPLATES_BACK_HREF = "/renovation";
const CHIP_BASE_CLASS = "flex h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm whitespace-nowrap";
const CHIP_IDLE_CLASS = "border-gray-300 bg-white text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white";
const CHIP_ACTIVE_CLASS = "border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white dark:text-gray-900";
const CHIP_DASHED_CLASS = "border-dashed border-gray-400 bg-white text-gray-900 dark:border-gray-500 dark:bg-gray-800 dark:text-white";
const BADGE_CLASS =
  "rounded-full bg-blue-100 px-1.5 py-0.5 text-[11px] font-medium text-blue-800 dark:bg-blue-950 dark:text-blue-200";

interface DraftRoomType {
  roomType: string;
  label: string;
}

export default function RenovationTemplatesPage() {
  const templatesQuery = useRenovationRoomTemplates();
  const materialsQuery = useRenovationMaterials();
  const { currentHouseholdRole } = useHouseholdContext();
  const canManage = canManageHousehold(currentHouseholdRole);
  const { setLeftAction } = useHeaderActions();

  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftRoomType | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  // Bumped after a reset so the editor remounts from the default template the server now returns.
  const [editorVersion, setEditorVersion] = useState(0);

  const templates: RenovationRoomTemplateResponse[] = templatesQuery.data ?? [];
  const load = loadFailure(templatesQuery);
  const savedSelection = templates.find((t) => t.roomType === selectedType) ?? templates[0];
  const activeTemplate = draft ? undefined : savedSelection;
  const activeType = draft?.roomType ?? savedSelection?.roomType ?? "";
  const activeLabel = activeTemplate?.label ?? draft?.label ?? "";

  useEffect(() => {
    setLeftAction({ type: "back", href: TEMPLATES_BACK_HREF });
    return () => setLeftAction({ type: "menu" });
  }, [setLeftAction]);

  const pick = (roomType: string) => {
    setDraft(null);
    setSelectedType(roomType);
  };

  const handleCreateDraft = (label: string) => {
    setNewOpen(false);
    setDraft({ roomType: deriveSlug(label), label: label.trim() });
  };

  const renderChips = () => (
    <div role="group" aria-label="Room types" className="flex gap-2 overflow-x-auto pb-1">
      {templates.map((template) => {
        const pressed = !draft && template.roomType === activeType;
        return (
          <button
            key={template.roomType}
            type="button"
            aria-pressed={pressed}
            onClick={() => pick(template.roomType ?? "")}
            className={cn(CHIP_BASE_CLASS, pressed ? CHIP_ACTIVE_CLASS : CHIP_IDLE_CLASS)}
          >
            {template.label}
            {template.isCustomised && <span className={BADGE_CLASS}>Customised</span>}
          </button>
        );
      })}
      {draft && (
        <button type="button" aria-pressed className={cn(CHIP_BASE_CLASS, CHIP_ACTIVE_CLASS)}>
          {draft.label}
          <span className={BADGE_CLASS}>New</span>
        </button>
      )}
      {canManage && (
        <button type="button" onClick={() => setNewOpen(true)} className={cn(CHIP_BASE_CLASS, CHIP_DASHED_CLASS)}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          New room type
        </button>
      )}
    </div>
  );

  const renderBody = () => {
    if (templatesQuery.isLoading) {
      return <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">Loading room types…</p>;
    }
    if (load.failed) {
      return <LoadErrorState what="room templates" onRetry={load.retry} isRetrying={load.isRetrying} />;
    }
    return (
      <>
        {renderChips()}
        {activeType ? (
          <>
            <div className="flex flex-col gap-1">
              <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">{activeLabel}</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                What a new {activeLabel.toLowerCase()} starts with. Each line is measured from the room&apos;s size, so
                the same template prices a small room or a large one.
              </p>
            </div>
            <TemplateEditor
              key={`${activeType}:${editorVersion}`}
              roomType={activeType}
              template={activeTemplate}
              draftLabel={draft?.label ?? ""}
              materials={materialsQuery.data ?? []}
              canManage={canManage}
              onCreated={(roomType) => {
                setDraft(null);
                setSelectedType(roomType);
              }}
              onReset={() => setEditorVersion((version) => version + 1)}
              onRemoved={() => setSelectedType(null)}
            />
          </>
        ) : (
          <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">No room types yet</p>
        )}
      </>
    );
  };

  return (
    <div className="container mx-auto max-w-2xl space-y-4 px-4 py-4">
      <PageTitle>Room templates</PageTitle>
      {renderBody()}
      {newOpen && (
        <NewRoomTypeDialog
          existingTypes={templates.map((t) => t.roomType ?? "")}
          onOpenChange={setNewOpen}
          onCreate={handleCreateDraft}
        />
      )}
    </div>
  );
}
