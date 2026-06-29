import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import {
  useRecipeShares,
  useCreateRecipeShare,
  useRevokeRecipeShare,
  useSharedRecipe,
  useCloneSharedRecipe,
} from '@/hooks/useRecipeShares'

const mockApiFetch = jest.fn()

jest.mock('@/lib/apiClient', () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}))

function jsonResponse(data: unknown, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(data),
  } as Response)
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  Wrapper.displayName = 'TestQueryClientWrapper'
  return Wrapper
}

describe('useRecipeShares hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('useRecipeShares', () => {
    it('loads the share links for a recipe', async () => {
      const shares = [{ id: 1, token: 'abc', shareUrl: 'https://x/abc' }]
      mockApiFetch.mockReturnValueOnce(jsonResponse(shares))

      const { result } = renderHook(() => useRecipeShares(3), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(shares)
      expect(mockApiFetch).toHaveBeenCalledWith('/api/recipes/3/shares')
    })

    it('throws when the request fails', async () => {
      mockApiFetch.mockReturnValueOnce(jsonResponse({}, false, 500))

      const { result } = renderHook(() => useRecipeShares(3), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isError).toBe(true))
    })
  })

  describe('useCreateRecipeShare', () => {
    it('posts the expiry and target email', async () => {
      const created = { id: 9, token: 'tok', shareUrl: 'https://x/tok' }
      mockApiFetch.mockReturnValueOnce(jsonResponse(created))

      const { result } = renderHook(() => useCreateRecipeShare(3), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate({ expiry: 'OneWeek', targetEmail: 'a@b.c' })
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(created)
      expect(mockApiFetch).toHaveBeenCalledWith('/api/recipes/3/shares', {
        method: 'POST',
        body: JSON.stringify({ expiry: 'OneWeek', targetEmail: 'a@b.c' }),
      })
    })

    it('defaults a missing target email to null and throws on failure', async () => {
      mockApiFetch.mockReturnValueOnce(jsonResponse({}, false, 400))

      const { result } = renderHook(() => useCreateRecipeShare(3), {
        wrapper: createWrapper(),
      })

      result.current.mutate({ expiry: 'Forever' })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(mockApiFetch).toHaveBeenCalledWith('/api/recipes/3/shares', {
        method: 'POST',
        body: JSON.stringify({ expiry: 'Forever', targetEmail: null }),
      })
    })
  })

  describe('useRevokeRecipeShare', () => {
    it('deletes a share token', async () => {
      mockApiFetch.mockReturnValueOnce(jsonResponse(null))

      const { result } = renderHook(() => useRevokeRecipeShare(3), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate(42)
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockApiFetch).toHaveBeenCalledWith('/api/recipes/3/shares/42', {
        method: 'DELETE',
      })
    })

    it('throws when revoke fails', async () => {
      mockApiFetch.mockReturnValueOnce(jsonResponse({}, false, 500))

      const { result } = renderHook(() => useRevokeRecipeShare(3), {
        wrapper: createWrapper(),
      })

      result.current.mutate(42)

      await waitFor(() => expect(result.current.isError).toBe(true))
    })
  })

  describe('useSharedRecipe', () => {
    it('fetches a shared recipe by token via apiFetch', async () => {
      const recipe = { recipeId: 1, recipeName: 'Cake' }
      mockApiFetch.mockReturnValueOnce(jsonResponse(recipe))

      const { result } = renderHook(() => useSharedRecipe('token-123'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(recipe)
      expect(mockApiFetch).toHaveBeenCalledWith('/api/shared/recipes/token-123')
    })

    it('throws "Share link not found" on a non-ok response', async () => {
      mockApiFetch.mockReturnValueOnce(jsonResponse({}, false, 404))

      const { result } = renderHook(() => useSharedRecipe('missing'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toEqual(new Error('Share link not found'))
    })
  })

  describe('useCloneSharedRecipe', () => {
    it('clones into the target household and returns the new id', async () => {
      mockApiFetch.mockReturnValueOnce(jsonResponse({ id: 77 }))

      const { result } = renderHook(() => useCloneSharedRecipe('token-123'), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate(5)
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual({ id: 77 })
      expect(mockApiFetch).toHaveBeenCalledWith('/api/shared/recipes/token-123/clone', {
        method: 'POST',
        body: JSON.stringify({ targetHouseholdId: 5 }),
      })
    })

    it('maps a 403 to an authorization error', async () => {
      mockApiFetch.mockReturnValueOnce(jsonResponse({}, false, 403))

      const { result } = renderHook(() => useCloneSharedRecipe('token-123'), {
        wrapper: createWrapper(),
      })

      result.current.mutate(5)

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toEqual(
        new Error('You are not authorized to clone this recipe.')
      )
    })

    it('throws a generic error for other failures', async () => {
      mockApiFetch.mockReturnValueOnce(jsonResponse({}, false, 500))

      const { result } = renderHook(() => useCloneSharedRecipe('token-123'), {
        wrapper: createWrapper(),
      })

      result.current.mutate(5)

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toEqual(new Error('Failed to clone recipe'))
    })

    it('maps a 410 to an expired-link error', async () => {
      mockApiFetch.mockReturnValueOnce(jsonResponse({}, false, 410))

      const { result } = renderHook(() => useCloneSharedRecipe('token-123'), {
        wrapper: createWrapper(),
      })

      result.current.mutate(5)

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toEqual(new Error('This share link has expired.'))
    })
  })
})
