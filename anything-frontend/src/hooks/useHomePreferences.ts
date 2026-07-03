"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import type { HomeCardPreferenceResponse } from "@/lib/api-client/models/index";

export type { HomeCardPreferenceResponse };

export function useHomeCardPreferences() {
  return useQuery({
    queryKey: ["homeCardPreferences"],
    queryFn: () => apiClient.api.home.cardPreferences.get() as Promise<HomeCardPreferenceResponse[]>,
  });
}

export function useUpdateHomeCardPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (cards: { cardKey: string; isVisible: boolean }[]) =>
      apiClient.api.home.cardPreferences.put({ cards }),
    onMutate: async (cards) => {
      await queryClient.cancelQueries({ queryKey: ["homeCardPreferences"] });
      const previous = queryClient.getQueryData<HomeCardPreferenceResponse[]>(["homeCardPreferences"]);
      queryClient.setQueryData<HomeCardPreferenceResponse[]>(
        ["homeCardPreferences"],
        cards.map((c, i) => ({ cardKey: c.cardKey, sortOrder: i, isVisible: c.isVisible }))
      );
      return { previous };
    },
    onError: (_err, _cards, context) => {
      queryClient.setQueryData(["homeCardPreferences"], context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["homeCardPreferences"] });
    },
  });
}
