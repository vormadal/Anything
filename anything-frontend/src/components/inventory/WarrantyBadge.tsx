import { describeWarranty, type WarrantyStatus } from "@/lib/inventory";

const STATUS_CLASSES: Record<WarrantyStatus, string> = {
  expired: "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300",
  "expiring-soon": "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300",
  active: "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300",
};

interface WarrantyBadgeProps {
  warrantyExpiresOn: Date;
}

export function WarrantyBadge({ warrantyExpiresOn }: WarrantyBadgeProps) {
  const { status, label } = describeWarranty(warrantyExpiresOn);
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CLASSES[status]}`}
    >
      {label}
    </span>
  );
}
