interface CountBadgeProps {
  count: number | null | undefined;
}

export function CountBadge({ count }: CountBadgeProps) {
  if (!count || count <= 0) return null;
  return (
    <span className="min-w-[1.25rem] h-5 px-1.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-semibold flex items-center justify-center shrink-0">
      {count}
    </span>
  );
}
