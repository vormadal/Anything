"use client";

import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import {
  useFoodPlanSettings,
  useUpdateFoodPlanSettings,
  useSeasonalTagRules,
  useCreateSeasonalTagRule,
  useUpdateSeasonalTagRule,
  useDeleteSeasonalTagRule,
  type SeasonalTagRuleResponse,
} from "@/hooks/useFoodPlans";
import type { FoodPlanSettings } from "@/lib/api-client/models/index";
import { useHeaderActions } from "@/context/PageActionsContext";
import { PageTitle } from "@/components/PageTitle";
import { toast } from "sonner";
import { X } from "lucide-react";
import {
  ALL_DAYS,
  ALL_MONTHS,
  DEFAULT_ACTIVE_DAYS,
  bitmaskToDaySet,
  daySetToBitmask,
  bitmaskToMonthSet,
  monthSetToBitmask,
} from "@/lib/foodPlanUtils";

const SETTINGS_UPDATE_SUCCESS = "Settings updated";
const SETTINGS_UPDATE_ERROR = "Failed to update settings. Please try again.";

const TUNING_DEFAULTS = {
  suggestionRotationWeight: 40,
  suggestionFavoritesWeight: 25,
  suggestionSeasonalityWeight: 20,
  suggestionExclusionWindowDays: 6,
  suggestionRotationSaturationDays: 84,
  suggestionSeasonalityWindowDays: 21,
};

type TuningValues = typeof TUNING_DEFAULTS;

const TUNING_FIELDS: { key: keyof TuningValues; label: string; help: string; max: number }[] = [
  {
    key: "suggestionRotationWeight",
    label: "Rotation weight",
    help: "Points for recipes you haven't had in a while.",
    max: 100,
  },
  {
    key: "suggestionFavoritesWeight",
    label: "Favorites weight",
    help: "Points for recipes you plan often.",
    max: 100,
  },
  {
    key: "suggestionSeasonalityWeight",
    label: "Seasonality weight",
    help: "Points for recipes planned around this time in previous years.",
    max: 100,
  },
  {
    key: "suggestionExclusionWindowDays",
    label: "Exclusion window (days)",
    help: "Recipes planned within this many days are not suggested. Use 13 for two-week planning.",
    max: 60,
  },
  {
    key: "suggestionRotationSaturationDays",
    label: "Rotation saturation (days)",
    help: "Days without planning a recipe until it counts as fully rested.",
    max: 365,
  },
  {
    key: "suggestionSeasonalityWindowDays",
    label: "Seasonality window (days)",
    help: "How close to today (day of year) an old plan must be to count as seasonal.",
    max: 182,
  },
];

function tuningFromSettings(settings: FoodPlanSettings | undefined): TuningValues {
  return {
    suggestionRotationWeight:
      settings?.suggestionRotationWeight ?? TUNING_DEFAULTS.suggestionRotationWeight,
    suggestionFavoritesWeight:
      settings?.suggestionFavoritesWeight ?? TUNING_DEFAULTS.suggestionFavoritesWeight,
    suggestionSeasonalityWeight:
      settings?.suggestionSeasonalityWeight ?? TUNING_DEFAULTS.suggestionSeasonalityWeight,
    suggestionExclusionWindowDays:
      settings?.suggestionExclusionWindowDays ?? TUNING_DEFAULTS.suggestionExclusionWindowDays,
    suggestionRotationSaturationDays:
      settings?.suggestionRotationSaturationDays ?? TUNING_DEFAULTS.suggestionRotationSaturationDays,
    suggestionSeasonalityWindowDays:
      settings?.suggestionSeasonalityWindowDays ?? TUNING_DEFAULTS.suggestionSeasonalityWindowDays,
  };
}

function SettingsForm({ initialActiveDays }: { initialActiveDays: number }) {
  const updateSettings = useUpdateFoodPlanSettings();
  const [selectedDays, setSelectedDays] = useState<Set<number>>(
    () => bitmaskToDaySet(initialActiveDays)
  );

  const toggleDay = (index: number) => {
    setSelectedDays((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDays.size === 0) return;
    try {
      await updateSettings.mutateAsync({
        activeDays: daySetToBitmask(selectedDays),
      });
      toast.success(SETTINGS_UPDATE_SUCCESS);
    } catch {
      toast.error(SETTINGS_UPDATE_ERROR);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Active days
        </span>
        <div className="flex flex-wrap gap-2">
          {ALL_DAYS.map((day, index) => (
            <label
              key={day}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm cursor-pointer select-none transition-colors ${
                selectedDays.has(index)
                  ? "bg-blue-500 border-blue-500 text-white"
                  : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-blue-400"
              }`}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={selectedDays.has(index)}
                onChange={() => toggleDay(index)}
              />
              {day.slice(0, 3)}
            </label>
          ))}
        </div>
      </div>

      <Button
        type="submit"
        disabled={updateSettings.isPending || selectedDays.size === 0}
        className="w-full"
      >
        {updateSettings.isPending ? "Saving..." : "Save Settings"}
      </Button>
    </form>
  );
}

function SuggestionTuningForm({ settings }: { settings: FoodPlanSettings | undefined }) {
  const updateSettings = useUpdateFoodPlanSettings();
  const [values, setValues] = useState<TuningValues>(() => tuningFromSettings(settings));

  const activeDays = settings?.activeDays ?? DEFAULT_ACTIVE_DAYS;

  const setValue = (key: keyof TuningValues, value: number) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const save = async (tuning: TuningValues) => {
    try {
      await updateSettings.mutateAsync({ activeDays, ...tuning });
      toast.success(SETTINGS_UPDATE_SUCCESS);
    } catch {
      toast.error(SETTINGS_UPDATE_ERROR);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await save(values);
  };

  const handleReset = async () => {
    setValues(TUNING_DEFAULTS);
    await save(TUNING_DEFAULTS);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {TUNING_FIELDS.map(({ key, label, help, max }) => (
          <div key={key}>
            <label
              htmlFor={key}
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              {label}
            </label>
            <input
              id={key}
              type="number"
              min={0}
              max={max}
              value={values[key]}
              onChange={(e) => {
                const parsed = Number(e.target.value);
                setValue(key, Number.isNaN(parsed) ? 0 : parsed);
              }}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{help}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={updateSettings.isPending} className="flex-1">
          {updateSettings.isPending ? "Saving..." : "Save Tuning"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={updateSettings.isPending}
          onClick={handleReset}
        >
          Reset to defaults
        </Button>
      </div>
    </form>
  );
}

const EMPTY_RULE_FORM = {
  keyword: "",
  matchPrefix: false,
  months: new Set<number>(),
  boost: 10,
};

function SeasonalTagsSection() {
  const { data: rules, isLoading } = useSeasonalTagRules();
  const createRule = useCreateSeasonalTagRule();
  const updateRule = useUpdateSeasonalTagRule();
  const deleteRule = useDeleteSeasonalTagRule();

  const [editingRuleId, setEditingRuleId] = useState<number | null>(null);
  const [form, setForm] = useState(() => ({ ...EMPTY_RULE_FORM, months: new Set<number>() }));

  const resetForm = () => {
    setEditingRuleId(null);
    setForm({ ...EMPTY_RULE_FORM, months: new Set<number>() });
  };

  const toggleMonth = (index: number) => {
    setForm((prev) => {
      const months = new Set(prev.months);
      if (months.has(index)) {
        months.delete(index);
      } else {
        months.add(index);
      }
      return { ...prev, months };
    });
  };

  const startEdit = (rule: SeasonalTagRuleResponse) => {
    setEditingRuleId(rule.id ?? null);
    setForm({
      keyword: rule.keyword ?? "",
      matchPrefix: rule.matchPrefix ?? false,
      months: bitmaskToMonthSet(rule.months ?? 0),
      boost: rule.boost ?? 10,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.keyword.trim() || form.months.size === 0) return;
    const payload = {
      keyword: form.keyword.trim(),
      matchPrefix: form.matchPrefix,
      months: monthSetToBitmask(form.months),
      boost: form.boost,
    };
    try {
      if (editingRuleId != null) {
        await updateRule.mutateAsync({ ruleId: editingRuleId, ...payload });
        toast.success("Seasonal tag updated");
      } else {
        await createRule.mutateAsync(payload);
        toast.success("Seasonal tag added");
      }
      resetForm();
    } catch {
      toast.error("Failed to save seasonal tag. Please try again.");
    }
  };

  const handleDelete = async (ruleId: number) => {
    try {
      await deleteRule.mutateAsync(ruleId);
      toast.success("Seasonal tag removed");
      if (editingRuleId === ruleId) resetForm();
    } catch {
      toast.error("Failed to remove seasonal tag. Please try again.");
    }
  };

  const formatMonths = (bitmask: number): string => {
    const months = bitmaskToMonthSet(bitmask);
    return ALL_MONTHS.filter((_, i) => months.has(i)).join(", ");
  };

  const isSaving = createRule.isPending || updateRule.isPending;

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-400 dark:text-gray-500">
        Recipes tagged with these keywords get a boost in the selected months.
      </p>

      {isLoading && (
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
      )}

      {rules?.length !== undefined && rules.length > 0 && (
        <ul className="space-y-1.5">
          {rules.map((rule) => (
            <li
              key={rule.id}
              className="flex items-center gap-2 rounded border border-gray-200 dark:border-gray-600 px-2 py-1.5 text-sm"
            >
              <div className="flex-1 min-w-0">
                <span className="font-medium text-gray-800 dark:text-gray-200">
                  {rule.keyword}
                </span>
                {rule.matchPrefix && (
                  <span className="ml-1.5 rounded bg-gray-100 dark:bg-gray-700 px-1 py-0.5 text-xs text-gray-500 dark:text-gray-400">
                    prefix
                  </span>
                )}
                <span className="ml-1.5 text-xs text-gray-400 dark:text-gray-500">
                  +{rule.boost} · {formatMonths(rule.months ?? 0)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => startEdit(rule)}
                className="shrink-0 text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => rule.id != null && handleDelete(rule.id)}
                className="shrink-0 text-gray-400 hover:text-red-500 transition-colors"
                aria-label={`Remove seasonal tag ${rule.keyword}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleSubmit} className="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={form.keyword}
            onChange={(e) => setForm((prev) => ({ ...prev, keyword: e.target.value }))}
            placeholder="Tag keyword, e.g. jul"
            maxLength={50}
            className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
          <input
            type="number"
            min={0}
            max={50}
            value={form.boost}
            onChange={(e) => {
              const parsed = Number(e.target.value);
              setForm((prev) => ({ ...prev, boost: Number.isNaN(parsed) ? 0 : parsed }));
            }}
            aria-label="Boost"
            title="Boost points"
            className="w-20 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            checked={form.matchPrefix}
            onChange={(e) => setForm((prev) => ({ ...prev, matchPrefix: e.target.checked }))}
          />
          Match tags starting with the keyword
        </label>

        <div className="flex flex-wrap gap-1.5">
          {ALL_MONTHS.map((month, index) => (
            <label
              key={month}
              className={`px-2 py-1 rounded-full border text-xs cursor-pointer select-none transition-colors ${
                form.months.has(index)
                  ? "bg-blue-500 border-blue-500 text-white"
                  : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-blue-400"
              }`}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={form.months.has(index)}
                onChange={() => toggleMonth(index)}
              />
              {month}
            </label>
          ))}
        </div>

        <div className="flex gap-2">
          <Button
            type="submit"
            disabled={isSaving || !form.keyword.trim() || form.months.size === 0}
            className="flex-1"
          >
            {editingRuleId != null ? "Update tag" : "Add tag"}
          </Button>
          {editingRuleId != null && (
            <Button type="button" variant="ghost" onClick={resetForm}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

export default function FoodPlanSettingsPage() {
  const { data: settings, isLoading } = useFoodPlanSettings();
  const { setLeftAction } = useHeaderActions();

  useEffect(() => {
    setLeftAction({ type: "back", href: "/food-plans" });
    return () => setLeftAction({ type: "menu" });
  }, [setLeftAction]);

  if (isLoading) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        Loading...
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-4 max-w-lg space-y-4">
      <PageTitle>Food Plan Settings</PageTitle>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Food Plan Settings
        </h2>
        <SettingsForm initialActiveDays={settings?.activeDays ?? DEFAULT_ACTIVE_DAYS} />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
          Suggestions
        </h2>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
          Fine-tune how meal suggestions are ranked.
        </p>
        <SuggestionTuningForm settings={settings} />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
          Seasonal tags
        </h2>
        <SeasonalTagsSection />
      </div>
    </div>
  );
}
