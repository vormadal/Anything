/** Thin decorative progress bar. The numbers it stands for are printed next to it. */
export function MiniBar({ percent }: { percent: number }) {
  return (
    <div aria-hidden="true" className="flex h-1.5 w-full overflow-hidden rounded-full bg-blue-100 dark:bg-blue-900/40">
      <div className="h-full bg-gray-900 dark:bg-gray-100" style={{ width: `${percent}%` }} />
    </div>
  );
}
