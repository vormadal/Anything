"use client";

import dynamic from "next/dynamic";
import type { ReactNodeViewProps } from "@tiptap/react";

/**
 * The `listEmbed` node view, loaded on demand.
 *
 * The indirection is deliberate. `listEmbed` is registered in
 * `createNoteExtensions()`, which is also what the importer feeds to
 * `generateJSON` — a pure document conversion that needs the schema and nothing
 * else. A direct import of the card would put the shopping-list hooks, and
 * through them the whole Kiota API client, in the module graph of every
 * consumer of the note schema (it breaks the importer's Jest suites outright,
 * since several Kiota packages are ESM-only). Deferring it keeps the schema
 * cheap to import and means a note without an embed never loads the card.
 */
export const EmbeddedListNodeView = dynamic<ReactNodeViewProps>(
  () => import("./EmbeddedList").then((module) => module.EmbeddedListNodeView),
  { ssr: false }
);
