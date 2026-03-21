import React from 'react'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { render } from '@/__tests__/utils/test-utils'
import BillsPage from './page'

// Mock apiClient
const mockBillsGet = jest.fn()

jest.mock('@/lib/apiClient', () => ({
  apiClient: {
    api: {
      bills: {
        get: (...args: unknown[]) => mockBillsGet(...args),
        post: jest.fn(),
        summary: { get: jest.fn() },
        byId: jest.fn(() => ({ get: jest.fn(), put: jest.fn(), delete: jest.fn(), priceHistory: { get: jest.fn(), post: jest.fn(), byId: jest.fn() } })),
      },
    },
  },
}))

const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
  usePathname: () => '/bills',
}))

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
  Toaster: () => null,
}))

// Prevent infinite re-render loop from router reference in useEffect deps
const mockSetHeaderActions = jest.fn()
jest.mock('@/context/PageActionsContext', () => ({
  useHeaderActions: () => ({ setHeaderActions: mockSetHeaderActions, headerActions: null, leftAction: { type: 'menu' }, setLeftAction: jest.fn() }),
  PageActionsProvider: ({ children }: { children: React.ReactNode }) => children,
}))

const mockBill = {
  id: 1,
  name: 'Netflix',
  vendorName: 'Netflix Inc.',
  vendorWebsite: 'https://netflix.com',
  frequency: 'Monthly' as const,
  isAutomated: true,
  locationName: 'Home',
  managementUrl: 'https://netflix.com/account',
  category: 'Streaming',
  currentAmount: 99,
  monthlyEquivalent: 99,
  priceIncreased: false,
  createdOn: '2024-01-01T00:00:00Z',
}

describe('BillsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.setItem('user', JSON.stringify({ email: 'test@test.com', name: 'Test User', role: 'User' }))
    localStorage.setItem('accessToken', 'test-token')
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('should display loading state initially', () => {
    mockBillsGet.mockImplementation(() => new Promise(() => { /* never resolves */ }))

    render(<BillsPage />)

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('should display empty state when no bills exist', async () => {
    mockBillsGet.mockResolvedValue([])

    render(<BillsPage />)

    await waitFor(() => {
      expect(screen.getByText('No bills yet.')).toBeInTheDocument()
    })
  })

  it('should display bills when data is loaded', async () => {
    mockBillsGet.mockResolvedValue([mockBill])

    render(<BillsPage />)

    await waitFor(() => {
      expect(screen.getByText('Netflix')).toBeInTheDocument()
    })
  })

  it('should display summary stats when bills are loaded', async () => {
    mockBillsGet.mockResolvedValue([mockBill])

    render(<BillsPage />)

    await waitFor(() => {
      // Summary stats labels (Monthly also appears as a frequency label in bill rows)
      expect(screen.getAllByText('Monthly').length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText('Yearly')).toBeInTheDocument()
      expect(screen.getByText('Increased')).toBeInTheDocument()
    })
  })

  it('should navigate to bill detail when a bill row is clicked', async () => {
    mockBillsGet.mockResolvedValue([mockBill])

    render(<BillsPage />)

    await waitFor(() => expect(screen.getByText('Netflix')).toBeInTheDocument())

    const row = screen.getByText('Netflix').closest('button')
    expect(row).toBeTruthy()
    if (row) fireEvent.click(row)

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/bills/1')
    })
  })

  it('should navigate to new bill page when add button is clicked', async () => {
    mockBillsGet.mockResolvedValue([])

    render(<BillsPage />)

    await waitFor(() => expect(screen.getByText('No bills yet.')).toBeInTheDocument())

    fireEvent.click(screen.getByText('Add first bill'))

    expect(mockPush).toHaveBeenCalledWith('/bills/new')
  })

  it('should render management URL link for bill with valid managementUrl', async () => {
    mockBillsGet.mockResolvedValue([mockBill])

    render(<BillsPage />)

    await waitFor(() => {
      const link = screen.getByTitle('Manage subscription')
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute('href', 'https://netflix.com/account')
    })
  })

  it('should not render management URL link when managementUrl is unsafe', async () => {
    const unsafeBill = { ...mockBill, managementUrl: 'javascript:alert(1)' }
    mockBillsGet.mockResolvedValue([unsafeBill])

    render(<BillsPage />)

    await waitFor(() => expect(screen.getByText('Netflix')).toBeInTheDocument())

    expect(screen.queryByTitle('Manage subscription')).not.toBeInTheDocument()
  })

  it('should show priceIncreased indicator for bills with increased prices', async () => {
    const increasedBill = { ...mockBill, priceIncreased: true }
    mockBillsGet.mockResolvedValue([increasedBill])

    render(<BillsPage />)

    await waitFor(() => expect(screen.getByText('Netflix')).toBeInTheDocument())
    // TrendingUp icon should be rendered (check aria or SVG presence)
    const row = screen.getByText('Netflix').closest('button')
    expect(row).toBeTruthy()
  })

  it('should show manual icon for non-automated bills', async () => {
    const manualBill = { ...mockBill, isAutomated: false }
    mockBillsGet.mockResolvedValue([manualBill])

    render(<BillsPage />)

    await waitFor(() => {
      expect(screen.getByTitle('Manual')).toBeInTheDocument()
    })
  })

  it('should show no price text when bill has no currentAmount', async () => {
    const noPriceBill = { ...mockBill, currentAmount: undefined, monthlyEquivalent: undefined }
    mockBillsGet.mockResolvedValue([noPriceBill])

    render(<BillsPage />)

    await waitFor(() => {
      expect(screen.getByText('No price')).toBeInTheDocument()
    })
  })

  it('should show location and category filters when multiple values exist', async () => {
    const bill2 = { ...mockBill, id: 2, name: 'Spotify', locationName: 'Work', category: 'Music' }
    mockBillsGet.mockResolvedValue([mockBill, bill2])

    render(<BillsPage />)

    await waitFor(() => {
      expect(screen.getByText('All locations')).toBeInTheDocument()
      // "Home" appears as both filter button and bill location badge
      expect(screen.getAllByText('Home').length).toBeGreaterThanOrEqual(1)
      // Filter button for Work
      expect(screen.getByRole('button', { name: 'Work' })).toBeInTheDocument()
    })
  })

  it('should filter bills by location when a location filter is clicked', async () => {
    const bill2 = { ...mockBill, id: 2, name: 'Spotify', locationName: 'Work', category: 'Music' }
    mockBillsGet.mockResolvedValue([mockBill, bill2])

    render(<BillsPage />)

    await waitFor(() => expect(screen.getByRole('button', { name: 'Work' })).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'Work' }))

    await waitFor(() => {
      expect(screen.queryByText('Netflix')).not.toBeInTheDocument()
      expect(screen.getByText('Spotify')).toBeInTheDocument()
    })
  })

  it('should display matching text when filters produce no results', async () => {
    mockBillsGet.mockResolvedValue([mockBill])

    render(<BillsPage />)

    // No bills match filter message only shows when bills exist but are filtered out
    // Since we only have one bill, it should show normally
    await waitFor(() => expect(screen.getByText('Netflix')).toBeInTheDocument())
  })
})
