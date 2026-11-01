import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import {
  useRenovationProjects,
  useRenovationProject,
  useRenovationRoomTemplates,
  useRenovationMaterials,
  useRenovationPurchases,
  useCreateRenovationProject,
  useCreateRenovationRoom,
  useCreateRenovationLine,
  useCreateRenovationPurchase,
  useDeleteRenovationPurchase,
  useAddRenovationLineToInventory,
  useCreateRenovationMaterial,
} from '@/hooks/useRenovation'

const mockProjectsGet = jest.fn()
const mockProjectsPost = jest.fn()
const mockProjectByIdGet = jest.fn()
const mockRoomTemplatesGet = jest.fn()
const mockMaterialsGet = jest.fn()
const mockMaterialsPost = jest.fn()
const mockRoomsPost = jest.fn()
const mockRoomLinesPost = jest.fn()
const mockPurchasesGet = jest.fn()
const mockPurchasesPost = jest.fn()
const mockPurchaseDelete = jest.fn()
const mockInventoryItemPost = jest.fn()

const mockPurchaseLine = jest.fn((lineId: number) => ({ lineId, inventoryItem: { post: mockInventoryItemPost } }))
const mockPurchaseById = jest.fn((purchaseId: number) => ({
  purchaseId,
  delete: mockPurchaseDelete,
  lines: { byLineId: (lineId: number) => mockPurchaseLine(lineId) },
}))
const mockRoomById = jest.fn((roomId: number) => ({
  roomId,
  lines: { post: mockRoomLinesPost },
}))
const mockProjectById = jest.fn((projectId: number) => ({
  projectId,
  get: mockProjectByIdGet,
  purchases: {
    get: (...args: unknown[]) => mockPurchasesGet(...args),
    post: (...args: unknown[]) => mockPurchasesPost(...args),
    byPurchaseId: (purchaseId: number) => mockPurchaseById(purchaseId),
  },
  rooms: {
    post: (...args: unknown[]) => mockRoomsPost(...args),
    byRoomId: (roomId: number) => mockRoomById(roomId),
  },
}))

jest.mock('@/lib/apiClient', () => ({
  apiClient: {
    api: {
      renovationProjects: {
        get: (...args: unknown[]) => mockProjectsGet(...args),
        post: (...args: unknown[]) => mockProjectsPost(...args),
        byId: (projectId: number) => mockProjectById(projectId),
      },
      renovationMaterials: {
        get: (...args: unknown[]) => mockMaterialsGet(...args),
        post: (...args: unknown[]) => mockMaterialsPost(...args),
      },
      renovationRoomTemplates: {
        get: (...args: unknown[]) => mockRoomTemplatesGet(...args),
      },
    },
  },
}))

function createTestClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })
}

function createWrapper(queryClient: QueryClient) {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  Wrapper.displayName = 'TestQueryClientWrapper'
  return Wrapper
}

const mockProjectSummary = {
  id: 5,
  name: 'Kitchen refit',
  budget: 150000,
  estimate: 102183.94,
  actual: 0,
  forecast: 102183.94,
  roomCount: 1,
}

describe('useRenovation hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('queries', () => {
    it('fetches the project list', async () => {
      mockProjectsGet.mockResolvedValueOnce([mockProjectSummary])

      const { result } = renderHook(() => useRenovationProjects(), {
        wrapper: createWrapper(createTestClient()),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual([mockProjectSummary])
      expect(mockProjectsGet).toHaveBeenCalledTimes(1)
    })

    it('fetches a single project by id', async () => {
      const project = { ...mockProjectSummary, rooms: [] }
      mockProjectByIdGet.mockResolvedValueOnce(project)

      const { result } = renderHook(() => useRenovationProject(5), {
        wrapper: createWrapper(createTestClient()),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockProjectById).toHaveBeenCalledWith(5)
      expect(result.current.data).toEqual(project)
    })

    it('does not fetch a project without an id', () => {
      renderHook(() => useRenovationProject(0), { wrapper: createWrapper(createTestClient()) })

      expect(mockProjectById).not.toHaveBeenCalled()
    })

    it('fetches room templates and materials', async () => {
      mockRoomTemplatesGet.mockResolvedValueOnce([{ label: 'Kitchen', lines: [] }])
      mockMaterialsGet.mockResolvedValueOnce([{ id: 1, name: 'Oak laminate' }])

      const client = createTestClient()
      const templates = renderHook(() => useRenovationRoomTemplates(), { wrapper: createWrapper(client) })
      const materials = renderHook(() => useRenovationMaterials(), { wrapper: createWrapper(client) })

      await waitFor(() => expect(templates.result.current.isSuccess).toBe(true))
      await waitFor(() => expect(materials.result.current.isSuccess).toBe(true))

      expect(templates.result.current.data).toEqual([{ label: 'Kitchen', lines: [] }])
      expect(materials.result.current.data).toEqual([{ id: 1, name: 'Oak laminate' }])
    })

    it('fetches the purchases of a project', async () => {
      const purchases = [{ id: 9, totalAmount: 1200, lines: [] }]
      mockPurchasesGet.mockResolvedValueOnce(purchases)

      const { result } = renderHook(() => useRenovationPurchases(5), {
        wrapper: createWrapper(createTestClient()),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockProjectById).toHaveBeenCalledWith(5)
      expect(result.current.data).toEqual(purchases)
    })
  })

  describe('mutations', () => {
    it('creates a project and invalidates the list', async () => {
      mockProjectsPost.mockResolvedValueOnce({ id: 6 })
      const client = createTestClient()
      const invalidateSpy = jest.spyOn(client, 'invalidateQueries')

      const { result } = renderHook(() => useCreateRenovationProject(), {
        wrapper: createWrapper(client),
      })

      await act(async () => {
        await result.current.mutateAsync({ name: 'Bathroom', budget: 80000 })
      })

      expect(mockProjectsPost).toHaveBeenCalledWith({ name: 'Bathroom', budget: 80000, notes: null })
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['renovationProjects'] })
    })

    it('creates a room, passing the seeded line keys', async () => {
      mockRoomsPost.mockResolvedValueOnce({ id: 3 })
      const client = createTestClient()
      const invalidateSpy = jest.spyOn(client, 'invalidateQueries')

      const { result } = renderHook(() => useCreateRenovationRoom(5), {
        wrapper: createWrapper(client),
      })

      await act(async () => {
        await result.current.mutateAsync({
          name: 'Kitchen',
          roomType: 'Kitchen',
          length: 4.2,
          width: 3,
          height: 2.5,
          doors: 1,
          windows: 1,
          lineKeys: ['floor', 'walls'],
        })
      })

      expect(mockRoomsPost).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Kitchen', length: 4.2, lineKeys: ['floor', 'walls'] }),
      )
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['renovationProject', 5] })
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['renovationProjects'] })
    })

    it('creates a line under a room', async () => {
      mockRoomLinesPost.mockResolvedValueOnce({ id: 11 })

      const { result } = renderHook(() => useCreateRenovationLine(5), {
        wrapper: createWrapper(createTestClient()),
      })

      await act(async () => {
        await result.current.mutateAsync({
          roomId: 3,
          label: 'Countertop',
          group: 'Fixtures',
          basis: 'Fixed',
          unit: 'm',
          unitPrice: 1950,
          fixedQuantity: 3.6,
        })
      })

      expect(mockRoomById).toHaveBeenCalledWith(3)
      expect(mockRoomLinesPost).toHaveBeenCalledWith(
        expect.objectContaining({ label: 'Countertop', basis: 'Fixed', unitPrice: 1950, fixedQuantity: 3.6, materialId: null }),
      )
    })

    it('posts a purchase with a DateOnly date and invalidates the three keys', async () => {
      mockPurchasesPost.mockResolvedValueOnce({ id: 9 })
      const client = createTestClient()
      const invalidateSpy = jest.spyOn(client, 'invalidateQueries')

      const { result } = renderHook(() => useCreateRenovationPurchase(5), {
        wrapper: createWrapper(client),
      })

      await act(async () => {
        await result.current.mutateAsync({
          purchasedOn: '2026-03-10',
          vendor: 'Byggmakker',
          totalAmount: 1200,
          lines: [{ lineId: 100, quantity: 4, markComplete: true }, { lineId: 101, quantity: 2 }],
        })
      })

      expect(mockPurchasesPost).toHaveBeenCalledTimes(1)
      const [body] = mockPurchasesPost.mock.calls[0]
      expect(String(body.purchasedOn)).toBe('2026-03-10')
      expect(body).toMatchObject({
        vendor: 'Byggmakker',
        vendorId: null,
        totalAmount: 1200,
        notes: null,
        lines: [
          { lineId: 100, quantity: 4, markComplete: true },
          { lineId: 101, quantity: 2, markComplete: null },
        ],
      })

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['renovationPurchases', 5] })
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['renovationProject', 5] })
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['renovationProjects'] })
    })

    it('deletes a purchase and invalidates its project', async () => {
      mockPurchaseDelete.mockResolvedValueOnce(undefined)
      const client = createTestClient()
      const invalidateSpy = jest.spyOn(client, 'invalidateQueries')

      const { result } = renderHook(() => useDeleteRenovationPurchase(5), {
        wrapper: createWrapper(client),
      })

      await act(async () => {
        await result.current.mutateAsync(9)
      })

      expect(mockPurchaseById).toHaveBeenCalledWith(9)
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['renovationPurchases', 5] })
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['renovationProjects'] })
    })

    it('adds a purchased line to the inventory and invalidates inventory items', async () => {
      mockInventoryItemPost.mockResolvedValueOnce({ id: 42 })
      const client = createTestClient()
      const invalidateSpy = jest.spyOn(client, 'invalidateQueries')

      const { result } = renderHook(() => useAddRenovationLineToInventory(5), {
        wrapper: createWrapper(client),
      })

      await act(async () => {
        await result.current.mutateAsync({
          purchaseId: 9,
          lineId: 100,
          storageUnitId: 2,
          brand: 'Kährs',
        })
      })

      expect(mockPurchaseById).toHaveBeenCalledWith(9)
      expect(mockPurchaseLine).toHaveBeenCalledWith(100)
      expect(mockInventoryItemPost).toHaveBeenCalledWith(
        expect.objectContaining({ storageUnitId: 2, brand: 'Kährs', boxId: null, model: null, warrantyExpiresOn: null }),
      )
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['inventoryItems'] })
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['renovationPurchases', 5] })
    })

    it('creates a material and invalidates the materials list', async () => {
      mockMaterialsPost.mockResolvedValueOnce({ id: 4 })
      const client = createTestClient()
      const invalidateSpy = jest.spyOn(client, 'invalidateQueries')

      const { result } = renderHook(() => useCreateRenovationMaterial(), {
        wrapper: createWrapper(client),
      })

      await act(async () => {
        await result.current.mutateAsync({ name: 'Underlay', unit: 'm²', defaultPrice: 39, wastePercent: 5 })
      })

      expect(mockMaterialsPost).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Underlay', defaultPrice: 39, wastePercent: 5, category: null }),
      )
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['renovationMaterials'] })
    })
  })
})
