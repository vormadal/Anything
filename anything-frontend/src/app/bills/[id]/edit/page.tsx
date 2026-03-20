"use client";

import { useRouter, useParams } from "next/navigation";
import { useBill, BillResponse, useUpdateBill, PAYMENT_FREQUENCIES, FREQUENCY_LABELS, PaymentFrequency } from "@/hooks/useBills";
import { useLocations } from "@/hooks/useLocations";
import { useVendors } from "@/hooks/useVendors";

export default function EditBillPage() {
  const params = useParams();
  const billId = Number(params.id);
  const { data: bill, isLoading } = useBill(billId);

  if (isLoading) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">
        Loading...
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-gray-500 dark:text-gray-400">Bill not found.</p>
      </div>
    );
  }

  return <EditBillForm bill={bill} billId={billId} />;
}

function EditBillForm({ bill, billId }: { bill: BillResponse; billId: number }) {
  const router = useRouter();
  const { data: locations } = useLocations();
  const { data: vendors } = useVendors();
  const updateBill = useUpdateBill();

  // Use uncontrolled form with defaultValue so no useEffect needed
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);

    try {
      const { toast } = await import("sonner");
      await updateBill.mutateAsync({
        id: billId,
        name: (data.get("name") as string).trim(),
        vendorId: data.get("vendorId") ? Number(data.get("vendorId")) : undefined,
        frequency: data.get("frequency") as PaymentFrequency,
        isAutomated: data.get("isAutomated") === "true",
        locationId: data.get("locationId") ? Number(data.get("locationId")) : undefined,
        managementUrl: (data.get("managementUrl") as string).trim() || undefined,
        category: (data.get("category") as string).trim() || undefined,
        notes: (data.get("notes") as string).trim() || undefined,
      });
      toast.success("Bill updated");
      router.push(`/bills/${billId}`);
    } catch {
      const { toast } = await import("sonner");
      toast.error("Failed to update bill");
    }
  };

  return (
    <div className="container mx-auto px-4 py-4 max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="name"
            defaultValue={bill.name}
            required
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Vendor
          </label>
          <select
            name="vendorId"
            defaultValue={bill.vendorId ?? ""}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">No vendor</option>
            {vendors?.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Frequency
            </label>
            <select
              name="frequency"
              defaultValue={bill.frequency}
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
            <select
              name="isAutomated"
              defaultValue={String(bill.isAutomated)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="true">Automated</option>
              <option value="false">Manual</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Location
            </label>
            <select
              name="locationId"
              defaultValue={bill.locationId ?? ""}
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
              name="category"
              defaultValue={bill.category ?? ""}
              placeholder="e.g. Utilities"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Management URL
          </label>
          <input
            type="url"
            name="managementUrl"
            defaultValue={bill.managementUrl ?? ""}
            placeholder="https://..."
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Notes
          </label>
          <textarea
            name="notes"
            defaultValue={bill.notes ?? ""}
            rows={2}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            onClick={() => router.back()}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={updateBill.isPending}
            className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {updateBill.isPending ? "Saving..." : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
