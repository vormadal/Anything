import React from 'react'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { render } from '@/__tests__/utils/test-utils'
import BillDetailPage from './page'

// Mock apiClient
const mockBillByIdGet = jest.fn()
const mockBillByIdDelete = jest.fn()
const mockPriceHistoryGet = jest.fn()
const mockPriceHistoryPost = jest.fn()
const mockPriceHistoryByIdDelete = jest.fn()
const mockPriceHistoryById = jest.fn(() => ({
  put: jest.fn(),
  delete: mockPriceHistoryByIdDelete,
}))
const mockBillById = jest.fn(() => ({
  get: mockBillByIdGet,
  put: jest.fn(),
  delete: mockBillByIdDelete,
  priceHistory: {
    get: mockPriceHistoryGet,
    post: mockPriceHistoryPost,
    byId: mockPriceHistoryById,
  },
}))

jest.mock('@/lib/apiClient', () => ({
  apiClient: {
    api: {
      bills: {
        get: jest.fn(),
        post: jest.fn(),
        summary: { get: jest.fn() },
        byId: (...args: unknown[]) => mockBillById(...args),
      },
    },
  },
}))

const mockPush = jest.fn()
const mockBack = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
  useParams: () => ({ id: '1' }),
  usePathname: () => '/bills/1',
}))

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
  Toaster: () => null,
}))

// Prevent infinite re-render from router in useEffect deps
const mockSetHeaderActions = jest.fn()
jest.mock('@/context/PageActionsContext', () => ({
  useHeaderActions: () => ({ setHeaderActions: mockSetHeaderActions, headerActions: null, leftAction: { type: 'menu' }, setLeftAction: jest.fn() }),
  PageActionsProvider: ({ children }: { children: React.ReactNode }) => children,
}))

const mockBill = {
  id: 1,
  name: 'Netflix',
  vendorId: 1,
  vendorName: 'Netflix Inc.',
  vendorWebsite: 'https://netflix.com',
  frequency: 'Monthly' as const,
  isAutomated: true,
  locationId: 1,
  locationName: 'Home',
  managementUrl: 'https://netflix.com/account',
  category: 'Streaming',
  notes: 'Family plan',
  currentAmount: 99,
  monthlyEquivalent: 99,
  priceIncreased: false,
  createdOn: '2024-01-01T00:00:00Z',
}

const mockPriceHistory = [
  { id: 1, billId: 1, amount: 99, effectiveDate: '2024-06-01T00:00:00Z', createdOn: '2024-06-01T00:00:00Z' },
  { id: 2, billId: 1, amount: 89, effectiveDate: '2024-01-01T00:00:00Z', previousAmount: 89, createdOn: '2024-01-01T00:00:00Z' },
]

describe('BillDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.setItem('user', JSON.stringify({ email: 'test@test.com', name: 'Test User', role: 'User' }))
    localStorage.setItem('accessToken', 'test-token')
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('should display loading state initially', () => {
    mockBillByIdGet.mockImplementation(() => new Promise(() => { /* never resolves */ }))
    mockPriceHistoryGet.mockResolvedValue([])

    render(<BillDetailPage />)

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('should display bill not found when bill is null', async () => {
    mockBillByIdGet.mockResolvedValue(null)
    mockPriceHistoryGet.mockResolvedValue([])

    render(<BillDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Bill not found.')).toBeInTheDocument()
    })
  })

  it('should display bill details when loaded', async () => {
    mockBillByIdGet.mockResolvedValue(mockBill)
    mockPriceHistoryGet.mockResolvedValue(mockPriceHistory)

    render(<BillDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Netflix Inc.')).toBeInTheDocument()
      expect(screen.getByText('Home')).toBeInTheDocument()
      expect(screen.getByText('Streaming')).toBeInTheDocument()
      expect(screen.getByText('Family plan')).toBeInTheDocument()
    })
  })

  it('should display vendor website link when vendorWebsite is safe', async () => {
    mockBillByIdGet.mockResolvedValue(mockBill)
    mockPriceHistoryGet.mockResolvedValue([])

    render(<BillDetailPage />)

    await waitFor(() => {
      const vendorLink = screen.getByRole('link', { name: /Netflix Inc/ })
      expect(vendorLink).toHaveAttribute('href', 'https://netflix.com')
    })
  })

  it('should not render vendor website link when vendorWebsite is unsafe', async () => {
    const unsafeBill = { ...mockBill, vendorWebsite: 'javascript:alert(1)' }
    mockBillByIdGet.mockResolvedValue(unsafeBill)
    mockPriceHistoryGet.mockResolvedValue([])

    render(<BillDetailPage />)

    await waitFor(() => expect(screen.getByText('Netflix Inc.')).toBeInTheDocument())

    // Vendor name shown as plain text, not as a link
    expect(screen.queryByRole('link', { name: /Netflix Inc/ })).not.toBeInTheDocument()
  })

  it('should display management URL link when managementUrl is safe', async () => {
    mockBillByIdGet.mockResolvedValue(mockBill)
    mockPriceHistoryGet.mockResolvedValue([])

    render(<BillDetailPage />)

    await waitFor(() => {
      const mgmtLink = screen.getByRole('link', { name: /Open website/ })
      expect(mgmtLink).toHaveAttribute('href', 'https://netflix.com/account')
    })
  })

  it('should not display management URL link when managementUrl is unsafe', async () => {
    const unsafeBill = { ...mockBill, managementUrl: 'javascript:void(0)' }
    mockBillByIdGet.mockResolvedValue(unsafeBill)
    mockPriceHistoryGet.mockResolvedValue([])

    render(<BillDetailPage />)

    await waitFor(() => expect(screen.getByText('Streaming')).toBeInTheDocument())

    expect(screen.queryByRole('link', { name: /Open website/ })).not.toBeInTheDocument()
  })

  it('should display price history entries', async () => {
    mockBillByIdGet.mockResolvedValue(mockBill)
    mockPriceHistoryGet.mockResolvedValue(mockPriceHistory)

    render(<BillDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Price history')).toBeInTheDocument()
    })
  })

  it('should show empty price history message when no entries', async () => {
    mockBillByIdGet.mockResolvedValue(mockBill)
    mockPriceHistoryGet.mockResolvedValue([])

    render(<BillDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('No price entries yet.')).toBeInTheDocument()
    })
  })

  it('should show add price form when Add entry is clicked', async () => {
    mockBillByIdGet.mockResolvedValue(mockBill)
    mockPriceHistoryGet.mockResolvedValue([])

    render(<BillDetailPage />)

    await waitFor(() => expect(screen.getByText('Add entry')).toBeInTheDocument())

    fireEvent.click(screen.getByText('Add entry'))

    expect(screen.getByPlaceholderText('Amount')).toBeInTheDocument()
  })

  it('should navigate to bills list after deleting a bill', async () => {
    mockBillByIdGet.mockResolvedValue(mockBill)
    mockPriceHistoryGet.mockResolvedValue([])
    mockBillByIdDelete.mockResolvedValue(undefined)
    jest.spyOn(window, 'confirm').mockReturnValue(true)

    render(<BillDetailPage />)

    await waitFor(() => expect(screen.getByText('Delete bill')).toBeInTheDocument())

    fireEvent.click(screen.getByText('Delete bill'))

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/bills')
    })
  })

  it('should show PriceChangeBadge for price history with previous amount', async () => {
    mockBillByIdGet.mockResolvedValue(mockBill)
    const historyWithPrevious = [
      { id: 1, billId: 1, amount: 99, effectiveDate: '2024-06-01T00:00:00Z', previousAmount: 89, createdOn: '2024-06-01T00:00:00Z' },
    ]
    mockPriceHistoryGet.mockResolvedValue(historyWithPrevious)

    render(<BillDetailPage />)

    await waitFor(() => {
      // Price change badge should show a percentage increase
      expect(screen.getByText(/\+.*%/)).toBeInTheDocument()
    })
  })

  it('should not show PriceChangeBadge when previous amount is null', async () => {
    mockBillByIdGet.mockResolvedValue(mockBill)
    const historyNoPrevious = [
      { id: 1, billId: 1, amount: 99, effectiveDate: '2024-06-01T00:00:00Z', previousAmount: null, createdOn: '2024-06-01T00:00:00Z' },
    ]
    mockPriceHistoryGet.mockResolvedValue(historyNoPrevious)

    render(<BillDetailPage />)

    await waitFor(() => expect(screen.getByText('Price history')).toBeInTheDocument())

    // No badge rendered
    expect(screen.queryByText(/\+.*%/)).not.toBeInTheDocument()
    expect(screen.queryByText(/-.*%/)).not.toBeInTheDocument()
  })

  it('should show manual badge when bill is not automated', async () => {
    const manualBill = { ...mockBill, isAutomated: false }
    mockBillByIdGet.mockResolvedValue(manualBill)
    mockPriceHistoryGet.mockResolvedValue([])

    render(<BillDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Manual')).toBeInTheDocument()
    })
  })

  it('should show automated badge when bill is automated', async () => {
    mockBillByIdGet.mockResolvedValue(mockBill)
    mockPriceHistoryGet.mockResolvedValue([])

    render(<BillDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Auto')).toBeInTheDocument()
    })
  })
})
