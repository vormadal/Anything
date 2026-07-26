"use client";

import { NoteWorkspace } from "@/components/notes/NoteWorkspace";

export default function NewNotePage() {
  const handleCreated = (id: number) => {
    // Swap the URL in place rather than navigating: a route change would remount
    // the editor and throw away the caret mid-sentence. Reloading or coming back
    // still lands on the real note.
    window.history.replaceState(null, "", `/notes/${id}`);
  };

  return <NoteWorkspace onCreated={handleCreated} />;
}
