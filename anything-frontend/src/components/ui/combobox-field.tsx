"use client";

import { useState, useRef } from "react";
import { X, Check, Plus } from "lucide-react";

interface ComboboxItem {
  id: number;
  name: string;
}

interface ComboboxFieldProps {
  items: ComboboxItem[];
  value: number | undefined;
  onChange: (id: number | undefined) => void;
  placeholder?: string;
  onCreateNew: (name: string) => void;
}

const INITIAL_DISPLAY_COUNT = 3;

export function ComboboxField({
  items,
  value,
  onChange,
  placeholder = "Search or create...",
  onCreateNew,
}: ComboboxFieldProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedItem = items.find((i) => i.id === value);

  const filtered = query.trim()
    ? items.filter((i) => i.name.toLowerCase().includes(query.toLowerCase()))
    : items.slice(0, INITIAL_DISPLAY_COUNT);

  const exactMatch = items.some(
    (i) => i.name.toLowerCase() === query.trim().toLowerCase()
  );
  const showCreate = query.trim().length > 0 && !exactMatch;

  function handleFocus() {
    setQuery("");
    setOpen(true);
  }

  function handleBlur(e: React.FocusEvent) {
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      setOpen(false);
      setQuery("");
    }
  }

  function handleSelect(item: ComboboxItem) {
    onChange(item.id);
    setQuery("");
    setOpen(false);
  }

  function handleClear(e: React.MouseEvent) {
    e.preventDefault();
    onChange(undefined);
    setQuery("");
  }

  function handleCreateNew() {
    const name = query.trim();
    setOpen(false);
    setQuery("");
    onCreateNew(name);
  }

  const displayValue = open ? query : (selectedItem?.name ?? "");

  return (
    <div ref={containerRef} className="relative" onBlur={handleBlur}>
      <div className="relative">
        <input
          type="text"
          value={displayValue}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={handleFocus}
          placeholder={placeholder}
          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-7"
        />
        {value !== undefined && !open && (
          <button
            type="button"
            onMouseDown={handleClear}
            tabIndex={-1}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Clear selection"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg overflow-hidden">
          {filtered.length === 0 && !showCreate && (
            <div className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500">
              No matches
            </div>
          )}
          {filtered.map((item) => (
            <button
              key={item.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(item)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 text-left"
            >
              <span className="w-3.5 shrink-0">
                {item.id === value && <Check className="h-3.5 w-3.5 text-blue-500" />}
              </span>
              {item.name}
            </button>
          ))}
          {showCreate && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleCreateNew}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700 text-left border-t border-gray-100 dark:border-gray-700"
            >
              <Plus className="h-3.5 w-3.5 shrink-0" />
              Create &quot;{query.trim()}&quot;
            </button>
          )}
        </div>
      )}
    </div>
  );
}
