"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useCreateNote } from "@/hooks/useNotes";
import { useSmartBack } from "@/hooks/useSmartBack";
import { PageTitle } from "@/components/PageTitle";
import { NoteForm, type NoteFormValues } from "@/components/notes/NoteForm";

export default function NewNotePage() {
  const router = useRouter();
  const { navigateBack } = useSmartBack();
  const createNote = useCreateNote();

  const handleSubmit = async (values: NoteFormValues) => {
    try {
      const created = await createNote.mutateAsync(values);
      // Land on the new note rather than the list: the user has just written
      // content and expects to see it, not a row referencing it.
      router.push(created?.id ? `/notes/${created.id}` : "/notes");
    } catch {
      toast.error("Failed to create note");
    }
  };

  return (
    <div className="container mx-auto px-4 py-4 max-w-2xl">
      <PageTitle>New Note</PageTitle>
      <NoteForm
        submitLabel="Create"
        isPending={createNote.isPending}
        onSubmit={handleSubmit}
        onCancel={() => navigateBack("/notes")}
      />
    </div>
  );
}
