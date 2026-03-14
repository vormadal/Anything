"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function EditFoodPlanPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/food-plans/settings");
  }, [router]);

  return null;
}
