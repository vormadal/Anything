import React from "react";
import { screen, fireEvent, waitFor, within } from "@testing-library/react";
import { renderWithClient } from "@/__tests__/utils/test-utils";
import RenovationRoomPage from "./page";

const mockUseProject = jest.fn()
const mockUseMaterials = jest.fn()
const mockUpdateLine = jest.fn()
const mockReplaceMaterial = jest.fn()
const mockDeleteLine = jest.fn()
const mockCreateMaterial = jest.fn()

jest.mock("@/hooks/useRenovation", () => ({
  useRenovationProject: (...args: unknown[]) => mockUseProject(...args),
  useRenovationMaterials: (...args: unknown[]) => mockUseMaterials(...args),
  useUpdateRenovationLine: () => ({ mutateAsync: mockUpdateLine, isPending: false }),
  useReplaceRenovationMaterial: () => ({ mutateAsync: mockReplaceMaterial, isPending: false }),
  useDeleteRenovationLine: () => ({ mutateAsync: mockDeleteLine, isPending: false }),
  useCreateRenovationMaterial: () => ({ mutateAsync: mockCreateMaterial, isPending: false }),
  useCreateRenovationLine: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useUpdateRenovationRoom: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useDeleteRenovationRoom: () => ({ mutateAsync: jest.fn(), isPending: false }),
}))

const mockPush = jest.fn()
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
  useParams: () => ({ id: "7", roomId: "3" }),
  usePathname: () => "/renovation/7/rooms/3",
}))

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
  Toaster: () => null,
}))

const query = (data: unknown, overrides: Record<string, unknown> = {}) => ({
  data,
  isLoading: false,
  isError: false,
  isPaused: false,
  isFetching: false,
  refetch: jest.fn(),
  ...overrides,
})

const lines = [
  {
    id: 11, roomId: 3, label: "Floor", group: "Surfaces", basis: "Floor", description: "Oak laminate 8 mm",
    materialId: 1, unit: "m²", unitPrice: 289, wastePercent: 10, fixedQuantity: null, isComplete: false,
    sortOrder: 1, requiredQuantity: 13.9, purchasedQuantity: 6, remainingQuantity: 7.9,
    estimate: 4017, actual: 1734, forecast: 4017, status: "Partial",
  },
  {
    id: 12, roomId: 3, label: "Underlay", group: "Surfaces", basis: "Floor", description: "Foam underlay 3 mm",
    materialId: 2, unit: "m²", unitPrice: 39, wastePercent: 0, fixedQuantity: null, isComplete: true,
    sortOrder: 2, requiredQuantity: 13.2, purchasedQuantity: 13.2, remainingQuantity: 0,
    estimate: 516, actual: 480, forecast: 480, status: "Complete",
  },
  {
    id: 14, roomId: 3, label: "Cabinets", group: "Fixtures", basis: "Fixed", description: "Kitchen cabinets, 8 units",
    materialId: null, unit: "set", unitPrice: 42000, wastePercent: 0, fixedQuantity: 1, isComplete: true,
    sortOrder: 3, requiredQuantity: 1, purchasedQuantity: 1, remainingQuantity: 0,
    estimate: 42000, actual: 44950, forecast: 44950, status: "Complete",
  },
  {
    id: 15, roomId: 3, label: "Electrician", group: "Labour", basis: "Fixed", description: "Sockets, lighting",
    materialId: null, unit: "job", unitPrice: 12000, wastePercent: 0, fixedQuantity: 1, isComplete: false,
    sortOrder: 4, requiredQuantity: 1, purchasedQuantity: 0, remainingQuantity: 1,
    estimate: 12000, actual: 0, forecast: 12000, status: "NotStarted",
  },
]

const project = {
  id: 7,
  name: "Home",
  rooms: [
    {
      id: 3, name: "Kitchen", length: 4.2, width: 3, height: 2.5, doors: 1, windows: 1,
      floorArea: 12.6, wallArea: 32.6, perimeter: 13.2,
      estimate: 102184, actual: 81295, forecast: 104677, lines,
    },
  ],
}

const materials = [
  { id: 1, name: "Oak laminate 8 mm", unit: "m²", defaultPrice: 289, wastePercent: 10, category: "Flooring" },
  { id: 4, name: "Vinyl click plank 5 mm", unit: "m²", defaultPrice: 249, wastePercent: 10, productUrl: "https://example.com/vinyl" },
  { id: 9, name: "Ceiling spray", unit: "L", defaultPrice: 100, wastePercent: 0 },
]

function openLine(label: string) {
  fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${label}\\b`) }))
}

beforeEach(() => {
  jest.clearAllMocks()
  mockUseProject.mockReturnValue(query(project))
  mockUseMaterials.mockReturnValue(query(materials))
  mockUpdateLine.mockResolvedValue(undefined)
  mockReplaceMaterial.mockResolvedValue({ updatedLines: 2, skippedPurchasedLines: 1 })
  mockDeleteLine.mockResolvedValue(undefined)
})

describe("RenovationRoomPage", () => {
  it("shows the room budget, grouped lines, statuses and variances", () => {
    renderWithClient(<RenovationRoomPage />)

    expect(screen.getByRole("heading", { name: "Surfaces" })).toBeInTheDocument()
    expect(screen.getByText("1 of 2 bought")).toBeInTheDocument()
    expect(screen.getByText("102,184 kr")).toBeInTheDocument()
    expect(screen.getByText("81,295 kr")).toBeInTheDocument()
    expect(screen.getByText("Partial · 6.0 m² of 13.9 m²")).toBeInTheDocument()
    expect(screen.getAllByText("Bought")).toHaveLength(2)
    expect(screen.getByText("−36 vs est.")).toBeInTheDocument()
    expect(screen.getByText("+2,950 vs est.")).toBeInTheDocument()
    expect(screen.getByText("Partial · 6.0 m² of 13.9 m²").closest("button")).toHaveTextContent("Floor")
  })

  it("flags the forecast in orange when it is above the estimate", () => {
    renderWithClient(<RenovationRoomPage />)
    expect(screen.getByText("104,677 kr")).toHaveClass("text-orange-700")
  })

  it("shows a not-found message for a room that is not in the project", () => {
    mockUseProject.mockReturnValue(query({ ...project, rooms: [] }))
    renderWithClient(<RenovationRoomPage />)
    expect(screen.getByText("Room not found.")).toBeInTheDocument()
  })

  it("shows the load-failure state instead of an empty room when the project fails to load", () => {
    mockUseProject.mockReturnValue(query(undefined, { isError: true }))
    renderWithClient(<RenovationRoomPage />)
    expect(screen.getByText("Couldn't load this room")).toBeInTheDocument()
    expect(screen.queryByText("Room not found.")).not.toBeInTheDocument()
  })

  it("links a line to the purchase page for that line", () => {
    renderWithClient(<RenovationRoomPage />)
    openLine("Underlay")
    expect(screen.getByRole("link", { name: "Record a purchase" })).toHaveAttribute(
      "href",
      "/renovation/7/shopping?line=12",
    )
  })

  it("changes a line to a material of the same unit, copying its price onto this line only", async () => {
    renderWithClient(<RenovationRoomPage />)
    openLine("Floor")
    fireEvent.click(screen.getByRole("button", { name: "Change material" }))

    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).queryByRole("radio", { name: /Ceiling spray/ })).not.toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole("radio", { name: /Vinyl click plank/ }))
    fireEvent.click(screen.getByRole("button", { name: "Use Vinyl click plank 5 mm" }))

    await waitFor(() =>
      expect(mockUpdateLine).toHaveBeenCalledWith(
        expect.objectContaining({
          lineId: 11,
          label: "Floor",
          group: "Surfaces",
          basis: "Floor",
          materialId: 4,
          description: "Vinyl click plank 5 mm",
          unit: "m²",
          unitPrice: 249,
          wastePercent: 10,
        }),
      ),
    )
    expect(mockReplaceMaterial).not.toHaveBeenCalled()
  })

  it("shows materials of every unit when 'Show all units' is ticked", async () => {
    renderWithClient(<RenovationRoomPage />)
    openLine("Floor")
    fireEvent.click(screen.getByRole("button", { name: "Change material" }))
    const dialog = await screen.findByRole("dialog")

    fireEvent.click(within(dialog).getByRole("checkbox", { name: "Show all units" }))
    expect(within(dialog).getByRole("radio", { name: /Ceiling spray/ })).toBeInTheDocument()
  })

  it("replaces the material in all rooms and reports what was kept", async () => {
    renderWithClient(<RenovationRoomPage />)
    openLine("Floor")
    fireEvent.click(screen.getByRole("button", { name: "Change material" }))
    const dialog = await screen.findByRole("dialog")

    fireEvent.click(within(dialog).getByRole("radio", { name: /All rooms/ }))
    fireEvent.click(within(dialog).getByRole("radio", { name: /Vinyl click plank/ }))
    fireEvent.click(screen.getByRole("button", { name: "Use Vinyl click plank 5 mm" }))

    await waitFor(() =>
      expect(mockReplaceMaterial).toHaveBeenCalledWith({ fromMaterialId: 1, toMaterialId: 4 }),
    )
    expect(await screen.findByText("2 updated, 1 already bought kept")).toBeInTheDocument()
    expect(mockUpdateLine).not.toHaveBeenCalled()
  })

  it("shows the 409 message inline when a line with purchases cannot be deleted", async () => {
    mockDeleteLine.mockRejectedValue({ responseStatusCode: 409 })
    renderWithClient(<RenovationRoomPage />)
    openLine("Underlay")
    fireEvent.click(screen.getByRole("button", { name: "Delete line" }))
    fireEvent.click(screen.getByRole("button", { name: "Yes, delete" }))

    expect(await screen.findByText("This line has purchases — delete those first")).toBeInTheDocument()
    expect(mockDeleteLine).toHaveBeenCalledWith(12)
  })

  it("adds a line from the Add line dialog", async () => {
    renderWithClient(<RenovationRoomPage />)
    fireEvent.click(screen.getByRole("button", { name: "Add line" }))
    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByRole("heading", { name: "Add line" })).toBeInTheDocument()
  })
})
