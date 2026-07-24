/**
 * Typography for rendered note content, shared by the editor and the read-only
 * view so a note looks identical in both. Written as explicit child selectors
 * rather than a typography plugin — the project has no @tailwindcss/typography
 * dependency, and the note schema is small enough to style directly.
 */
export const NOTE_PROSE_CLASSES = [
  "text-sm text-gray-900 dark:text-gray-100 leading-relaxed",
  "[&_p]:my-2",
  "[&_h1]:text-xl [&_h1]:font-bold [&_h1]:mt-4 [&_h1]:mb-2",
  "[&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-3 [&_h2]:mb-1.5",
  "[&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1",
  "[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2",
  "[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2",
  "[&_li]:my-0.5",
  "[&_blockquote]:border-l-2 [&_blockquote]:border-gray-300 [&_blockquote]:dark:border-gray-600 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-gray-600 [&_blockquote]:dark:text-gray-400",
  "[&_pre]:bg-gray-100 [&_pre]:dark:bg-gray-900 [&_pre]:rounded-md [&_pre]:p-3 [&_pre]:overflow-x-auto [&_pre]:text-xs [&_pre]:my-2",
  "[&_code]:font-mono [&_code]:text-xs",
  "[&_strong]:font-semibold",
].join(" ");
