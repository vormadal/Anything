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

const HOME_CARD_PREFERENCES_KEY = ["homeCardPreferences"] as const;

// The PUT persists the exact, complete set of preferences we send (cardKey +
// index-based sortOrder + visibility), so the payload itself is the authoritative
// post-write state — there is nothing extra to learn from a re-read.
function toPreferenceResponses(
  cards: { cardKey: string; isVisible: boolean }[]
): HomeCardPreferenceResponse[] {
  return cards.map((c, i) => ({ cardKey: c.cardKey, sortOrder: i, isVisible: c.isVisible }));
}

export function useUpdateHomeCardPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    // Toggling/reordering fires a mutation per action, and drag or rapid taps can start a
    // second one before the first's PUT settles. A shared scope runs same-scope mutations
    // in FIFO order (the next one waits for the previous to settle) instead of letting them
    // race over the network, so an out-of-order response can no longer land last and have
    // its onSuccess clobber the cache with a stale, already-superseded snapshot.
    scope: { id: "homeCardPreferences" },
    mutationFn: (cards: { cardKey: string; isVisible: boolean }[]) =>
      apiClient.api.home.cardPreferences.put({ cards }),
    onMutate: async (cards) => {
      await queryClient.cancelQueries({ queryKey: HOME_CARD_PREFERENCES_KEY });
      const previous = queryClient.getQueryData<HomeCardPreferenceResponse[]>(HOME_CARD_PREFERENCES_KEY);
      queryClient.setQueryData<HomeCardPreferenceResponse[]>(
        HOME_CARD_PREFERENCES_KEY,
        toPreferenceResponses(cards)
      );
      return { previous };
    },
    onSuccess: (_data, cards) => {
      // Reassert the state we just persisted as the cache truth. Crucially we do NOT
      // refetch here: in the deployed environment a GET issued immediately after the
      // write can lag (read-after-write) and return the pre-update rows, which would
      // clobber the change so it only shows up after a manual page reload (issue #634).
      // The home page and this page share this query key, so keeping the confirmed
      // value in the cache is what makes the change appear on the home page instantly.
      queryClient.setQueryData<HomeCardPreferenceResponse[]>(
        HOME_CARD_PREFERENCES_KEY,
        toPreferenceResponses(cards)
      );
    },
    onError: (_err, _cards, context) => {
      // The write failed, so our optimistic value is wrong — roll back and re-sync
      // against the server to recover the real persisted state.
      queryClient.setQueryData(HOME_CARD_PREFERENCES_KEY, context?.previous);
      queryClient.invalidateQueries({ queryKey: HOME_CARD_PREFERENCES_KEY });
    },
  });
}
