"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NewFoodPlanPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/food-plans");
  }, [router]);

  return null;
}
