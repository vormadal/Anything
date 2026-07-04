import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import { ApiError } from '@/lib/apiClient'
import {
  useRecipeShares,
  useCreateRecipeShare,
  useRevokeRecipeShare,
  useSharedRecipe,
  useCloneSharedRecipe,
} from '@/hooks/useRecipeShares'

const mockSharesGet = jest.fn()
const mockSharesPost = jest.fn()
const mockSharesItemDelete = jest.fn()
const mockSharesItemById: jest.Mock = jest.fn(() => ({ delete: mockSharesItemDelete }))
const mockShares = { get: mockSharesGet, post: mockSharesPost, byTokenId: mockSharesItemById }
const mockRecipesById: jest.Mock = jest.fn(() => ({ shares: mockShares }))
const mockSharedRecipeGet = jest.fn()
const mockClonePost = jest.fn()
const mockSharedRecipeByToken: jest.Mock = jest.fn(() => ({
  get: mockSharedRecipeGet,
  clone: { post: mockClonePost },
}))

jest.mock('@/lib/apiClient', () => ({
  apiClient: {
    api: {
      recipes: { byId: (...args: unknown[]) => mockRecipesById(...args) },
      shared: { recipes: { byToken: (...args: unknown[]) => mockSharedRecipeByToken(...args) } },
    },
  },
  ApiError: class MockApiError extends Error {
    responseStatusCode?: number
  },
}))

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

const normalizedShareDefaults = {
  targetEmail: null,
  expiresAt: null,
  createdOn: '',
  isExpired: false,
  isClaimed: false,
}

describe('useRecipeShares hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('useRecipeShares', () => {
    it('loads the share links for a recipe', async () => {
      mockSharesGet.mockResolvedValueOnce([{ id: 1, token: 'abc', shareUrl: 'https://x/abc' }])

      const { result } = renderHook(() => useRecipeShares(3), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual([
        { id: 1, token: 'abc', shareUrl: 'https://x/abc', ...normalizedShareDefaults },
      ])
      expect(mockRecipesById).toHaveBeenCalledWith(3)
      expect(mockSharesGet).toHaveBeenCalled()
    })

    it('throws when the request fails', async () => {
      mockSharesGet.mockRejectedValueOnce(new Error('server error'))

      const { result } = renderHook(() => useRecipeShares(3), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isError).toBe(true))
    })
  })

  describe('useCreateRecipeShare', () => {
    it('posts the expiry and target email', async () => {
      mockSharesPost.mockResolvedValueOnce({ id: 9, token: 'tok', shareUrl: 'https://x/tok' })

      const { result } = renderHook(() => useCreateRecipeShare(3), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate({ expiry: 'OneWeek', targetEmail: 'a@b.c' })
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual({
        id: 9,
        token: 'tok',
        shareUrl: 'https://x/tok',
        ...normalizedShareDefaults,
      })
      expect(mockSharesPost).toHaveBeenCalledWith({ expiry: 'OneWeek', targetEmail: 'a@b.c' })
    })

    it('defaults a missing target email to null and throws on failure', async () => {
      mockSharesPost.mockRejectedValueOnce(new Error('failed'))

      const { result } = renderHook(() => useCreateRecipeShare(3), {
        wrapper: createWrapper(),
      })

      result.current.mutate({ expiry: 'Forever' })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(mockSharesPost).toHaveBeenCalledWith({ expiry: 'Forever', targetEmail: null })
    })
  })

  describe('useRevokeRecipeShare', () => {
    it('deletes a share token', async () => {
      mockSharesItemDelete.mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useRevokeRecipeShare(3), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate(42)
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockSharesItemById).toHaveBeenCalledWith(42)
      expect(mockSharesItemDelete).toHaveBeenCalled()
    })

    it('throws when revoke fails', async () => {
      mockSharesItemDelete.mockRejectedValueOnce(new Error('server error'))

      const { result } = renderHook(() => useRevokeRecipeShare(3), {
        wrapper: createWrapper(),
      })

      result.current.mutate(42)

      await waitFor(() => expect(result.current.isError).toBe(true))
    })
  })

  describe('useSharedRecipe', () => {
    it('fetches a shared recipe by token via the generated client', async () => {
      mockSharedRecipeGet.mockResolvedValueOnce({ recipeId: 1, recipeName: 'Cake' })

      const { result } = renderHook(() => useSharedRecipe('token-123'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual({
        recipeId: 1,
        recipeName: 'Cake',
        notes: null,
        cookTimeMinutes: null,
        servings: null,
        servingsType: '',
        ingredients: [],
        steps: [],
        tags: [],
        imageUrls: [],
        isExpired: false,
        isTargeted: false,
        targetEmail: null,
      })
      expect(mockSharedRecipeByToken).toHaveBeenCalledWith('token-123')
    })

    it('throws "Share link not found" when the client returns nothing', async () => {
      mockSharedRecipeGet.mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useSharedRecipe('missing'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toEqual(new Error('Share link not found'))
    })
  })

  describe('useCloneSharedRecipe', () => {
    it('clones into the target household and returns the new id', async () => {
      mockClonePost.mockResolvedValueOnce({ id: 77 })

      const { result } = renderHook(() => useCloneSharedRecipe('token-123'), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate(5)
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual({ id: 77 })
      expect(mockSharedRecipeByToken).toHaveBeenCalledWith('token-123')
      expect(mockClonePost).toHaveBeenCalledWith({ targetHouseholdId: 5 })
    })

    it('maps a 403 to an authorization error', async () => {
      const error = new ApiError()
      error.responseStatusCode = 403
      mockClonePost.mockRejectedValueOnce(error)

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
      mockClonePost.mockRejectedValueOnce(new Error('server error'))

      const { result } = renderHook(() => useCloneSharedRecipe('token-123'), {
        wrapper: createWrapper(),
      })

      result.current.mutate(5)

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toEqual(new Error('Failed to clone recipe'))
    })

    it('maps a 410 to an expired-link error', async () => {
      const error = new ApiError()
      error.responseStatusCode = 410
      mockClonePost.mockRejectedValueOnce(error)

      const { result } = renderHook(() => useCloneSharedRecipe('token-123'), {
        wrapper: createWrapper(),
      })

      result.current.mutate(5)

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toEqual(new Error('This share link has expired.'))
    })
  })
})
