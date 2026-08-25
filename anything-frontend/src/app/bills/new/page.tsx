"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSmartBack } from "@/hooks/useSmartBack";
import { useCreateBill, type PaymentFrequency } from "@/hooks/useBills";
import { useLocations, type Location } from "@/hooks/useLocations";
import { useVendors, type Vendor } from "@/hooks/useVendors";
import { Button } from "@/components/ui/button";
import { PageTitle } from "@/components/PageTitle";
import { ComboboxField } from "@/components/ui/combobox-field";
import { BillRecurrenceFields } from "@/components/BillRecurrenceFields";
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

        <BillRecurrenceFields
          idPrefix="bill"
          isRecurring={isRecurring}
          onIsRecurringChange={setIsRecurring}
          isAutomated={isAutomated}
          onIsAutomatedChange={setIsAutomated}
          frequency={frequency}
          onFrequencyChange={setFrequency}
          hasVariableAmount={hasVariableAmount}
          onHasVariableAmountChange={setHasVariableAmount}
          oneTimeDate={initialDate}
          onOneTimeDateChange={setInitialDate}
        />

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
            {initialAmount && isRecurring && (
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
