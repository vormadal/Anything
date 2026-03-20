import React from 'react'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { render } from '@/__tests__/utils/test-utils'
import EditBillPage from './page'

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
  usePathname: () => '/bills/1/edit',
}))

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
  Toaster: () => null,
}))

const mockBill = {
  id: 1,
  name: 'Netflix',
  vendorId: 1,
  vendorName: 'Netflix Inc.',
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

const mockLocations = [{ id: 1, name: 'Home', createdOn: '2024-01-01T00:00:00Z' }]
const mockVendors = [{ id: 1, name: 'Netflix Inc.', createdOn: '2024-01-01T00:00:00Z' }]

function setupFetch(billData: unknown) {
  mockAuthenticatedFetch.mockImplementation((url: string, options?: RequestInit) => {
    const method = (options?.method ?? 'GET').toUpperCase()
    if (method !== 'GET') {
      return Promise.resolve({ ok: true, status: 204, json: async () => undefined })
    }
    if (url.includes('/api/locations')) {
      return Promise.resolve({ ok: true, status: 200, json: async () => mockLocations })
    }
    if (url.includes('/api/vendors')) {
      return Promise.resolve({ ok: true, status: 200, json: async () => mockVendors })
    }
    // /api/bills/1
    return Promise.resolve({ ok: true, status: 200, json: async () => billData })
  })
}

describe('EditBillPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    setupFetch(mockBill)
    localStorage.setItem('user', JSON.stringify({ email: 'test@test.com', name: 'Test User', role: 'User' }))
    localStorage.setItem('accessToken', 'test-token')
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('should display loading state initially', () => {
    mockAuthenticatedFetch.mockImplementation((url: string) => {
      if (url.includes('/api/locations') || url.includes('/api/vendors')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => [] })
      }
      return new Promise(() => { /* never resolves */ })
    })

    render(<EditBillPage />)

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('should display bill not found when bill is null', async () => {
    setupFetch(null)

    render(<EditBillPage />)

    await waitFor(() => {
      expect(screen.getByText('Bill not found.')).toBeInTheDocument()
    })
  })

  it('should render form with bill data', async () => {
    render(<EditBillPage />)

    await waitFor(() => {
      const nameInput = screen.getByDisplayValue('Netflix')
      expect(nameInput).toBeInTheDocument()
    })
  })

  it('should render management URL field', async () => {
    render(<EditBillPage />)

    await waitFor(() => {
      const urlInput = screen.getByDisplayValue('https://netflix.com/account')
      expect(urlInput).toBeInTheDocument()
    })
  })

  it('should render frequency options', async () => {
    render(<EditBillPage />)

    await waitFor(() => {
      expect(screen.getByText('Monthly')).toBeInTheDocument()
    })
  })

  it('should submit form and navigate back on success', async () => {
    render(<EditBillPage />)

    await waitFor(() => expect(screen.getByDisplayValue('Netflix')).toBeInTheDocument())

    const form = screen.getByText('Save changes').closest('form')
    expect(form).toBeTruthy()
    if (form) fireEvent.submit(form)

    await waitFor(() => {
      expect(mockAuthenticatedFetch).toHaveBeenCalledWith(
        'http://localhost:5238/api/bills/1',
        expect.objectContaining({ method: 'PUT' })
      )
      expect(mockPush).toHaveBeenCalledWith('/bills/1')
    })
  })

  it('should navigate back when cancel is clicked', async () => {
    render(<EditBillPage />)

    await waitFor(() => expect(screen.getByText('Cancel')).toBeInTheDocument())

    fireEvent.click(screen.getByText('Cancel'))

    expect(mockBack).toHaveBeenCalled()
  })
})
