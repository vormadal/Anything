import React from 'react'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { render } from '@/__tests__/utils/test-utils'
import BillDetailPage from './page'

const mockAuthenticatedFetch = jest.fn()

jest.mock('@/lib/apiClient', () => ({
  API_BASE_URL: 'http://localhost:5238',
  authenticatedFetch: (...args: unknown[]) => mockAuthenticatedFetch(...args),
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

function setupFetch(billData: unknown, priceHistoryData: unknown[] = []) {
  mockAuthenticatedFetch.mockImplementation((url: string, options?: RequestInit) => {
    const method = (options?.method ?? 'GET').toUpperCase()
    if (method !== 'GET') {
      return Promise.resolve({ ok: true, status: 204, json: async () => undefined })
    }
    if (url.includes('/price-history')) {
      return Promise.resolve({ ok: true, status: 200, json: async () => priceHistoryData })
    }
    return Promise.resolve({ ok: true, status: 200, json: async () => billData })
  })
}

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
    mockAuthenticatedFetch.mockImplementation((url: string) => {
      if (url.includes('/price-history')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => [] })
      }
      return new Promise(() => { /* never resolves */ })
    })

    render(<BillDetailPage />)

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('should display bill not found when bill is null', async () => {
    setupFetch(null)

    render(<BillDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Bill not found.')).toBeInTheDocument()
    })
  })

  it('should display bill details when loaded', async () => {
    setupFetch(mockBill, mockPriceHistory)

    render(<BillDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Netflix Inc.')).toBeInTheDocument()
      expect(screen.getByText('Home')).toBeInTheDocument()
      expect(screen.getByText('Streaming')).toBeInTheDocument()
      expect(screen.getByText('Family plan')).toBeInTheDocument()
    })
  })

  it('should display vendor website link when vendorWebsite is safe', async () => {
    setupFetch(mockBill)

    render(<BillDetailPage />)

    await waitFor(() => {
      const vendorLink = screen.getByRole('link', { name: /Netflix Inc/ })
      expect(vendorLink).toHaveAttribute('href', 'https://netflix.com')
    })
  })

  it('should not render vendor website link when vendorWebsite is unsafe', async () => {
    const unsafeBill = { ...mockBill, vendorWebsite: 'javascript:alert(1)' }
    setupFetch(unsafeBill)

    render(<BillDetailPage />)

    await waitFor(() => expect(screen.getByText('Netflix Inc.')).toBeInTheDocument())

    // Vendor name shown as plain text, not as a link
    expect(screen.queryByRole('link', { name: /Netflix Inc/ })).not.toBeInTheDocument()
  })

  it('should display management URL link when managementUrl is safe', async () => {
    setupFetch(mockBill)

    render(<BillDetailPage />)

    await waitFor(() => {
      const mgmtLink = screen.getByRole('link', { name: /Open website/ })
      expect(mgmtLink).toHaveAttribute('href', 'https://netflix.com/account')
    })
  })

  it('should not display management URL link when managementUrl is unsafe', async () => {
    const unsafeBill = { ...mockBill, managementUrl: 'javascript:void(0)' }
    setupFetch(unsafeBill)

    render(<BillDetailPage />)

    await waitFor(() => expect(screen.getByText('Streaming')).toBeInTheDocument())

    expect(screen.queryByRole('link', { name: /Open website/ })).not.toBeInTheDocument()
  })

  it('should display price history entries', async () => {
    setupFetch(mockBill, mockPriceHistory)

    render(<BillDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Price history')).toBeInTheDocument()
    })
  })

  it('should show empty price history message when no entries', async () => {
    setupFetch(mockBill, [])

    render(<BillDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('No price entries yet.')).toBeInTheDocument()
    })
  })

  it('should show add price form when Add entry is clicked', async () => {
    setupFetch(mockBill, [])

    render(<BillDetailPage />)

    await waitFor(() => expect(screen.getByText('Add entry')).toBeInTheDocument())

    fireEvent.click(screen.getByText('Add entry'))

    expect(screen.getByPlaceholderText('Amount')).toBeInTheDocument()
  })

  it('should navigate to bills list after deleting a bill', async () => {
    setupFetch(mockBill, [])
    jest.spyOn(window, 'confirm').mockReturnValue(true)

    render(<BillDetailPage />)

    await waitFor(() => expect(screen.getByText('Delete bill')).toBeInTheDocument())

    fireEvent.click(screen.getByText('Delete bill'))

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/bills')
    })
  })

  it('should show PriceChangeBadge for price history with previous amount', async () => {
    const historyWithPrevious = [
      { id: 1, billId: 1, amount: 99, effectiveDate: '2024-06-01T00:00:00Z', previousAmount: 89, createdOn: '2024-06-01T00:00:00Z' },
    ]
    setupFetch(mockBill, historyWithPrevious)

    render(<BillDetailPage />)

    await waitFor(() => {
      // Price change badge should show a percentage increase
      expect(screen.getByText(/\+.*%/)).toBeInTheDocument()
    })
  })

  it('should not show PriceChangeBadge when previous amount is null', async () => {
    const historyNoPrevious = [
      { id: 1, billId: 1, amount: 99, effectiveDate: '2024-06-01T00:00:00Z', previousAmount: null, createdOn: '2024-06-01T00:00:00Z' },
    ]
    setupFetch(mockBill, historyNoPrevious)

    render(<BillDetailPage />)

    await waitFor(() => expect(screen.getByText('Price history')).toBeInTheDocument())

    // No badge rendered
    expect(screen.queryByText(/\+.*%/)).not.toBeInTheDocument()
    expect(screen.queryByText(/-.*%/)).not.toBeInTheDocument()
  })

  it('should show manual badge when bill is not automated', async () => {
    const manualBill = { ...mockBill, isAutomated: false }
    setupFetch(manualBill, [])

    render(<BillDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Manual')).toBeInTheDocument()
    })
  })

  it('should show automated badge when bill is automated', async () => {
    setupFetch(mockBill, [])

    render(<BillDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Auto')).toBeInTheDocument()
    })
  })
})
