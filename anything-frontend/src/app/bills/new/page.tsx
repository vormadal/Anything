"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateBill, PAYMENT_FREQUENCIES, FREQUENCY_LABELS, PaymentFrequency } from "@/hooks/useBills";
import { useLocations } from "@/hooks/useLocations";
import { useVendors } from "@/hooks/useVendors";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function NewBillPage() {
  const router = useRouter();
  const createBill = useCreateBill();
  const { data: locations } = useLocations();
  const { data: vendors } = useVendors();

  const [name, setName] = useState("");
  const [vendorId, setVendorId] = useState<string>("");
  const [frequency, setFrequency] = useState<string>("Monthly");
  const [isAutomated, setIsAutomated] = useState(true);
  const [locationId, setLocationId] = useState<string>("");
  const [managementUrl, setManagementUrl] = useState("");
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");
  const [initialAmount, setInitialAmount] = useState("");
  const [initialDate, setInitialDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      await createBill.mutateAsync({
        name: name.trim(),
        vendorId: vendorId ? Number(vendorId) : undefined,
        frequency: frequency as PaymentFrequency,
        isAutomated,
        locationId: locationId ? Number(locationId) : undefined,
        managementUrl: managementUrl.trim() || undefined,
        category: category.trim() || undefined,
        notes: notes.trim() || undefined,
        initialAmount: initialAmount ? Number(initialAmount) : undefined,
        initialEffectiveDate: initialAmount ? new Date(initialDate).toISOString() : undefined,
      });
      toast.success("Bill added");
      router.push("/bills");
    } catch {
      toast.error("Failed to add bill");
    }
  };

  return (
    <div className="container mx-auto px-4 py-4 max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Netflix, Electricity"
            required
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Vendor */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Vendor
          </label>
          <select
            value={vendorId}
            onChange={(e) => setVendorId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">No vendor</option>
            {vendors?.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Manage vendors in Settings
          </p>
        </div>

        {/* Frequency + Automated */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Frequency
            </label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {PAYMENT_FREQUENCIES.map((f) => (
                <option key={f} value={f}>
                  {FREQUENCY_LABELS[f]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Payment
            </label>
            <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
              <button
                type="button"
                onClick={() => setIsAutomated(true)}
                className={`flex-1 py-2 text-xs font-medium transition-colors ${
                  isAutomated
                    ? "bg-green-600 text-white"
                    : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300"
                }`}
              >
                Auto
              </button>
              <button
                type="button"
                onClick={() => setIsAutomated(false)}
                className={`flex-1 py-2 text-xs font-medium transition-colors ${
                  !isAutomated
                    ? "bg-orange-500 text-white"
                    : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300"
                }`}
              >
                Manual
              </button>
            </div>
          </div>
        </div>

        {/* Location + Category */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Location
            </label>
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">None</option>
              {locations?.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Category
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Utilities"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Management URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Management URL
          </label>
          <input
            type="url"
            value={managementUrl}
            onChange={(e) => setManagementUrl(e.target.value)}
            placeholder="https://..."
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Initial price */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Current price
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              value={initialAmount}
              onChange={(e) => setInitialAmount(e.target.value)}
              placeholder="0.00"
              min="0.01"
              step="0.01"
              className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {initialAmount && (
              <input
                type="date"
                value={initialDate}
                onChange={(e) => setInitialDate(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes..."
            rows={2}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1"
            disabled={createBill.isPending || !name.trim()}
          >
            {createBill.isPending ? "Saving..." : "Add bill"}
          </Button>
        </div>
      </form>
    </div>
  );
}
