"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { useCreateRenovationRoom } from "@/hooks/useRenovation";
import { estimateTemplateRoom, indexMaterialsByName } from "@/lib/renovation";
import type {
  RenovationMaterialResponse,
  RenovationRoomTemplateResponse,
} from "@/lib/api-client/models/index";
import { RoomTypeStep } from "./RoomTypeStep";
import { RoomSizeStep } from "./RoomSizeStep";
import { RoomScopeStep } from "./RoomScopeStep";
import { WizardFooter } from "./WizardFooter";
import {
  defaultLineKeys,
  dimensionsValid,
  templateDimensionFields,
  templateId,
  toRoomDimensions,
  type CountKey,
  type DimensionFields,
  type DimensionKey,
  type WizardStep,
} from "./roomWizardModel";

interface RoomWizardProps {
  projectId: number;
  templates: readonly RenovationRoomTemplateResponse[];
  materials: readonly RenovationMaterialResponse[];
}

const EMPTY_DIMENSIONS: DimensionFields = { length: "", width: "", height: "", doors: 0, windows: 0 };

function errorMessage(err: unknown): string {
  return err instanceof Error && err.message ? err.message : "please try again.";
}

export function RoomWizard({ projectId, templates, materials }: RoomWizardProps) {
  const router = useRouter();
  const createRoom = useCreateRenovationRoom(projectId);
  const [step, setStep] = useState<WizardStep>(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [dims, setDims] = useState<DimensionFields>(EMPTY_DIMENSIONS);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const materialsByName = useMemo(() => indexMaterialsByName(materials), [materials]);
  const template = templates.find((candidate) => templateId(candidate) === selectedId) ?? null;

  const typeChosen = template !== null && name.trim() !== "";
  const sizeValid = dimensionsValid(dims);
  const canAdvance = step === 1 ? typeChosen : step === 2 && sizeValid;
  const canSubmit = typeChosen && sizeValid;

  // Steps 1 and 2 quote the template's default scope; step 3 quotes what is ticked.
  const pricingKeys = step === 3 ? selectedKeys : template ? defaultLineKeys(template) : [];
  const total = template
    ? estimateTemplateRoom(template, toRoomDimensions(dims), pricingKeys, materialsByName).total
    : 0;

  const pickTemplate = (picked: RenovationRoomTemplateResponse) => {
    setSelectedId(templateId(picked));
    setName(picked.label ?? "");
    setDims(templateDimensionFields(picked));
    setSelectedKeys(defaultLineKeys(picked));
  };

  const changeDimension = (key: DimensionKey, value: string) =>
    setDims((current) => ({ ...current, [key]: value }));

  const changeCount = (key: CountKey, delta: number) =>
    setDims((current) => ({ ...current, [key]: Math.max(0, current[key] + delta) }));

  const toggleLine = (key: string) =>
    setSelectedKeys((keys) => (keys.includes(key) ? keys.filter((k) => k !== key) : [...keys, key]));

  const goNext = () => {
    if (canAdvance && step < 3) setStep((step + 1) as WizardStep);
  };

  const goBack = () => {
    if (step > 1) setStep((step - 1) as WizardStep);
  };

  const submit = async () => {
    if (!template || !canSubmit) return;
    setSubmitError(null);
    try {
      const room = await createRoom.mutateAsync({
        name: name.trim(),
        roomType: template.roomType ?? undefined,
        ...toRoomDimensions(dims),
        lineKeys: selectedKeys,
      });
      router.push(room?.id ? `/renovation/${projectId}/rooms/${room.id}` : `/renovation/${projectId}`);
    } catch (err) {
      // The mutation's failure is shown inline rather than as a toast: the user is still on this form.
      setSubmitError(errorMessage(err));
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (step < 3) {
      goNext();
    } else {
      void submit();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex min-h-[calc(100dvh-7rem)] flex-col">
      <header className="flex h-14 items-center gap-2 border-b border-border px-2">
        <Link
          href={`/renovation/${projectId}`}
          aria-label="Close wizard"
          className="flex h-11 w-11 items-center justify-center rounded-lg"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </Link>
        <span className="text-[15px] font-semibold">Add room</span>
        <span className="ml-auto pr-2 text-[13px] text-muted-foreground">Step {step} of 3</span>
      </header>

      <div aria-hidden="true" className="grid grid-cols-3 gap-1.5 px-4 pt-3">
        {([1, 2, 3] as const).map((n) => (
          <div key={n} className={`h-1 rounded-full ${n <= step ? "bg-foreground" : "bg-border"}`} />
        ))}
      </div>

      <main className="flex flex-1 flex-col gap-5 px-4 pb-6 pt-5">
        {step === 1 && (
          <RoomTypeStep
            templates={templates}
            selectedId={selectedId}
            onPick={pickTemplate}
            name={name}
            onNameChange={setName}
          />
        )}
        {step === 2 && (
          <RoomSizeStep dims={dims} onDimensionChange={changeDimension} onCountChange={changeCount} />
        )}
        {step === 3 && template && (
          <RoomScopeStep
            template={template}
            dims={dims}
            selectedKeys={selectedKeys}
            materialsByName={materialsByName}
            onToggle={toggleLine}
          />
        )}
      </main>

      <WizardFooter
        step={step}
        total={total}
        name={name.trim()}
        canAdvance={canAdvance}
        canSubmit={canSubmit}
        isSubmitting={createRoom.isPending}
        submitError={submitError}
        onBack={goBack}
        onNext={goNext}
      />
    </form>
  );
}
