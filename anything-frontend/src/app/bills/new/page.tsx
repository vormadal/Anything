"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSmartBack } from "@/hooks/useSmartBack";
import { useCreateBill, PAYMENT_FREQUENCIES, FREQUENCY_LABELS, type PaymentFrequency } from "@/hooks/useBills";
import { useLocations, type Location } from "@/hooks/useLocations";
import { useVendors, type Vendor } from "@/hooks/useVendors";
import { Button } from "@/components/ui/button";
import { PageTitle } from "@/components/PageTitle";
import { ComboboxField } from "@/components/ui/combobox-field";
import { CreateVendorDialog } from "@/components/CreateVendorDialog";
import { CreateLocationDialog } from "@/components/CreateLocationDialog";
import { toast } from "sonner";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export default function NewBillPage() {
  const router = useRouter();
  const { navigateBack } = useSmartBack();
  const createBill = useCreateBill();
  const isOnline = useOnlineStatus();
  const { data: locations } = useLocations();
  const { data: vendors } = useVendors();

  const [name, setName] = useState("");
  const [vendorId, setVendorId] = useState<number | undefined>(undefined);
  const [frequency, setFrequency] = useState<string>("Monthly");
  const [isAutomated, setIsAutomated] = useState(true);
  const [isRecurring, setIsRecurring] = useState(true);
  const [hasVariableAmount, setHasVariableAmount] = useState(false);
  const [locationId, setLocationId] = useState<number | undefined>(undefined);
  const [managementUrl, setManagementUrl] = useState("");
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");
  const [initialAmount, setInitialAmount] = useState("");
  const [initialDate, setInitialDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [vendorDialog, setVendorDialog] = useState<string | null>(null);
  const [locationDialog, setLocationDialog] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      await createBill.mutateAsync({
        name: name.trim(),
        vendorId,
        frequency: isRecurring ? (frequency as PaymentFrequency) : "None",
        isAutomated,
        locationId,
        managementUrl: managementUrl.trim() || undefined,
        category: category.trim() || undefined,
        notes: notes.trim() || undefined,
        isRecurring,
        hasVariableAmount: isRecurring && hasVariableAmount,
        initialAmount: initialAmount ? Number(initialAmount) : undefined,
        initialEffectiveDate: initialAmount ? new Date(initialDate).toISOString() : undefined,
      });
      router.push("/bills");
    } catch {
      toast.error("Failed to add bill");
    }
  };

  function handleVendorCreated(vendor: Vendor) {
    setVendorId(vendor.id);
    setVendorDialog(null);
  }

  function handleLocationCreated(location: Location) {
    setLocationId(location.id);
    setLocationDialog(null);
  }

  return (
    <div className="container mx-auto px-4 py-4 max-w-lg">
      <PageTitle>New Bill</PageTitle>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div>
          <label htmlFor="bill-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            id="bill-name"
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
          <p className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Vendor
          </p>
          <ComboboxField
            items={vendors ?? []}
            value={vendorId}
            onChange={setVendorId}
            placeholder="Search vendors..."
            onCreateNew={(n) => setVendorDialog(n)}
          />
        </div>

        {/* Recurring + Automated */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Recurs
            </p>
            <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
              <button
                type="button"
                onClick={() => setIsRecurring(true)}
                className={`flex-1 py-2 text-xs font-medium transition-colors ${
                  isRecurring
                    ? "bg-blue-600 text-white"
                    : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300"
                }`}
              >
                Recurring
              </button>
              <button
                type="button"
                onClick={() => setIsRecurring(false)}
                className={`flex-1 py-2 text-xs font-medium transition-colors ${
                  !isRecurring
                    ? "bg-gray-600 text-white"
                    : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300"
                }`}
              >
                One-time
              </button>
            </div>
          </div>
          <div>
            <p className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Payment
            </p>
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

        {/* Frequency + Variable amount (only meaningful for recurring bills) */}
        {isRecurring && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="bill-frequency" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Frequency
              </label>
              <select
                id="bill-frequency"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {PAYMENT_FREQUENCIES.filter((f) => f !== "None").map((f) => (
                  <option key={f} value={f}>
                    {FREQUENCY_LABELS[f]}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end pb-2">
              <label htmlFor="bill-variable-amount" className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                <input
                  id="bill-variable-amount"
                  type="checkbox"
                  checked={hasVariableAmount}
                  onChange={(e) => setHasVariableAmount(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                Amount varies each period
              </label>
            </div>
          </div>
        )}

        {/* Location + Category */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Location
            </p>
            <ComboboxField
              items={locations ?? []}
              value={locationId}
              onChange={setLocationId}
              placeholder="Search locations..."
              onCreateNew={(n) => setLocationDialog(n)}
            />
          </div>
          <div>
            <label htmlFor="bill-category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Category
            </label>
            <input
              id="bill-category"
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
          <label htmlFor="bill-management-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Management URL
          </label>
          <input
            id="bill-management-url"
            type="url"
            value={managementUrl}
            onChange={(e) => setManagementUrl(e.target.value)}
            placeholder="https://..."
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Initial price */}
        <div>
          <label htmlFor="bill-initial-amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Current price
          </label>
          <div className="flex gap-2">
            <input
              id="bill-initial-amount"
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
          <label htmlFor="bill-notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Notes
          </label>
          <textarea
            id="bill-notes"
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
            onClick={() => navigateBack("/bills")}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1"
            disabled={createBill.isPending || !name.trim() || !isOnline}
            title={isOnline ? undefined : "Adding a bill requires an internet connection"}
          >
            {createBill.isPending ? "Saving..." : "Add bill"}
          </Button>
        </div>
      </form>

      {vendorDialog !== null && (
        <CreateVendorDialog
          initialName={vendorDialog}
          onCreated={handleVendorCreated}
          onCancel={() => setVendorDialog(null)}
        />
      )}

      {locationDialog !== null && (
        <CreateLocationDialog
          initialName={locationDialog}
          onCreated={handleLocationCreated}
          onCancel={() => setLocationDialog(null)}
        />
      )}
    </div>
  );
}
