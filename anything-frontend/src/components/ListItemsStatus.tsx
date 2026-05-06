interface Props {
  isLoading: boolean;
  error: Error | null | undefined;
  isEmpty: boolean;
}

export function ListItemsStatus({ isLoading, error, isEmpty }: Props) {
  return (
    <>
      {isLoading && (
        <div className="text-center py-8 text-gray-600 dark:text-gray-400">
          Loading...
        </div>
      )}
      {!!error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded mb-4">
          Failed to load items. Please try again later.
        </div>
      )}
      {isEmpty && (
        <div className="text-center py-8 text-gray-600 dark:text-gray-400">
          No items yet.
        </div>
      )}
    </>
  );
}
