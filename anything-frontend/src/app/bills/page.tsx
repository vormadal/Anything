"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useHeaderActions } from "@/context/PageActionsContext";
import { PageTitle } from "@/components/PageTitle";
import { useBills, useBillSummary, FREQUENCY_LABELS } from "@/hooks/useBills";
import { Button } from "@/components/ui/button";
import { isSafeUrl } from "@/lib/utils";
import {
  Plus,
  ChevronRight,
  TrendingUp,
  Zap,
  Hand,
  ExternalLink,
} from "lucide-react";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("da-DK", {
    style: "currency",
    currency: "DKK",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function BillsPage() {
  const router = useRouter();
  const { data: bills, isLoading } = useBills();
  const { data: billSummary } = useBillSummary();
  const { setHeaderActions } = useHeaderActions();
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  useEffect(() => {
    setHeaderActions(
      <Button variant="ghost" size="icon" onClick={() => router.push("/bills/new")} aria-label="Add bill">
        <Plus className="h-5 w-5" />
      </Button>
    );
    return () => setHeaderActions(null);
  }, [setHeaderActions, router]);

  const locations = [
    "all",
    ...Array.from(new Set((bills ?? []).map((b) => b.locationName).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b)),
  ];

  const categories = [
    "all",
    ...Array.from(new Set((bills ?? []).map((b) => b.category).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b)),
  ];

  const filtered = (bills ?? []).filter((b) => {
    if (locationFilter !== "all" && b.locationName !== locationFilter) return false;
    if (categoryFilter !== "all" && b.category !== categoryFilter) return false;
    return true;
  });

  const totalMonthly = filtered.reduce((sum, b) => sum + (b.monthlyEquivalent ?? 0), 0);
  const totalYearly = totalMonthly * 12;
  const increasedCount = filtered.filter((b) => b.priceIncreased).length;
  const currentMonth = new Date().toLocaleString("default", { month: "short" });
  const currentYear = new Date().getFullYear();

  return (
    <div className="container mx-auto px-4 py-4 max-w-2xl space-y-4">
      <PageTitle>Bills</PageTitle>
      {/* Summary stats */}
      {!isLoading && (bills ?? []).length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Monthly avg</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {formatCurrency(Math.round(totalMonthly))}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Yearly avg</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {formatCurrency(Math.round(totalYearly))}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{currentMonth}</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {formatCurrency(Math.round(billSummary?.totalCurrentMonthAmount ?? 0))}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{currentYear}</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {formatCurrency(Math.round(billSummary?.totalCurrentYearAmount ?? 0))}
            </p>
          </div>
          <div className="col-span-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Price increases</p>
            <p className={`text-lg font-bold ${increasedCount > 0 ? "text-red-500 dark:text-red-400" : "text-gray-400 dark:text-gray-500"}`}>
              {increasedCount}
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      {!isLoading && (bills ?? []).length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {locations.length > 2 && (
            <div className="flex gap-1 flex-wrap">
              {locations.map((loc) => (
                <button
                  key={loc}
                  onClick={() => setLocationFilter(loc)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    locationFilter === loc
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  {loc === "all" ? "All locations" : loc}
                </button>
              ))}
            </div>
          )}
          {categories.length > 2 && (
            <div className="flex gap-1 flex-wrap">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    categoryFilter === cat
                      ? "bg-purple-600 text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  {cat === "all" ? "All categories" : cat}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bill list */}
      {isLoading && (
        <div className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">Loading...</div>
      )}
      {!isLoading && filtered.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {(bills ?? []).length === 0 ? "No bills yet." : "No bills match the current filters."}
          </p>
          {(bills ?? []).length === 0 && (
            <Button size="sm" onClick={() => router.push("/bills/new")}>
              <Plus className="h-4 w-4 mr-1" />
              Add first bill
            </Button>
          )}
        </div>
      )}
      {!isLoading && filtered.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
          {filtered.map((bill) => (
            <button
              key={bill.id}
              type="button"
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left cursor-pointer"
              onClick={() => router.push(`/bills/${bill.id}`)}
            >
              <div className="flex-1 min-w-0 mr-3">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {bill.name}
                  </span>
                  {bill.priceIncreased && (
                    <TrendingUp className="h-3.5 w-3.5 text-red-500 shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {bill.vendorName && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {bill.vendorName}
                    </span>
                  )}
                  {bill.locationName && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                      {bill.locationName}
                    </span>
                  )}
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {FREQUENCY_LABELS[bill.frequency]}
                  </span>
                  {bill.isAutomated ? (
                    <span title="Automated"><Zap className="h-3 w-3 text-green-500" /></span>
                  ) : (
                    <span title="Manual"><Hand className="h-3 w-3 text-orange-400" /></span>
                  )}
                  {bill.managementUrl && isSafeUrl(bill.managementUrl) && (
                    <a
                      href={bill.managementUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-blue-500 hover:text-blue-600"
                      title="Manage subscription"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="text-right">
                  {bill.currentAmount !== undefined && bill.currentAmount !== null ? (
                    <>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(bill.currentAmount)}
                      </p>
                      {bill.monthlyEquivalent !== undefined &&
                        bill.monthlyEquivalent !== null &&
                        bill.frequency !== "Monthly" && (
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            {formatCurrency(Math.round(bill.monthlyEquivalent))}/mo
                          </p>
                        )}
                    </>
                  ) : (
                    <p className="text-xs text-gray-400 dark:text-gray-500">No price</p>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
