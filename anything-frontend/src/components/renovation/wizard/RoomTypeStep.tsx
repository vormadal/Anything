import Link from "next/link";
import type { RenovationRoomTemplateResponse } from "@/lib/api-client/models/index";
import { cn } from "@/lib/utils";
import { StepHeading } from "./StepHeading";
import { templateId, typicalSizeHint } from "./roomWizardModel";

interface RoomTypeStepProps {
  templates: readonly RenovationRoomTemplateResponse[];
  selectedId: string | null;
  onPick: (template: RenovationRoomTemplateResponse) => void;
  name: string;
  onNameChange: (name: string) => void;
}

export function RoomTypeStep({ templates, selectedId, onPick, name, onNameChange }: RoomTypeStepProps) {
  return (
    <div className="flex flex-col gap-5">
      <StepHeading
        title="What kind of room?"
        description="The room type picks a starting scope and typical size. You can change everything later."
      />
      {templates.length === 0 ? (
        <p className="text-sm text-muted-foreground">No room types to choose from.</p>
      ) : (
        <div role="group" aria-label="Room type" className="grid grid-cols-2 gap-2.5">
          {templates.map((template) => {
            const id = templateId(template);
            const selected = id === selectedId;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={selected}
                onClick={() => onPick(template)}
                className={cn(
                  "flex min-h-16 flex-col justify-center gap-0.5 rounded-xl px-3 py-2.5 text-left transition-colors",
                  selected ? "border-2 border-foreground bg-muted" : "border border-border bg-background",
                )}
              >
                <span className="text-[15px] font-semibold">{template.label}</span>
                <span className="text-xs text-muted-foreground">{typicalSizeHint(template)}</span>
              </button>
            );
          })}
        </div>
      )}
      <Link
        href="/renovation/templates"
        className="flex min-h-11 items-center text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
      >
        Edit room templates
      </Link>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="room-name" className="text-sm font-medium">
          Room name
        </label>
        <input
          id="room-name"
          type="text"
          required
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          className="h-11 rounded-lg border border-input bg-background px-3 text-[15px]"
        />
      </div>
    </div>
  );
}
