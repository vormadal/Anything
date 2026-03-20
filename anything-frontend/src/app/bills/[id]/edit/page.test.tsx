import React from 'react'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { render } from '@/__tests__/utils/test-utils'
import EditBillPage from './page'

// Mock apiClient
const mockBillByIdGet = jest.fn()
const mockBillByIdPut = jest.fn()
const mockLocationsGet = jest.fn()
const mockVendorsGet = jest.fn()

jest.mock('@/lib/apiClient', () => ({
  apiClient: {
    api: {
      bills: {
        get: jest.fn(),
        post: jest.fn(),
        summary: { get: jest.fn() },
        byId: jest.fn(() => ({
          get: mockBillByIdGet,
          put: mockBillByIdPut,
          delete: jest.fn(),
          priceHistory: { get: jest.fn(), post: jest.fn(), byId: jest.fn() },
        })),
      },
      locations: {
        get: (...args: unknown[]) => mockLocationsGet(...args),
        post: jest.fn(),
        byId: jest.fn(),
      },
      vendors: {
        get: (...args: unknown[]) => mockVendorsGet(...args),
        post: jest.fn(),
        byId: jest.fn(),
      },
    },
  },
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

describe('EditBillPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockLocationsGet.mockResolvedValue([{ id: 1, name: 'Home', createdOn: '2024-01-01T00:00:00Z' }])
    mockVendorsGet.mockResolvedValue([{ id: 1, name: 'Netflix Inc.', createdOn: '2024-01-01T00:00:00Z' }])
    localStorage.setItem('user', JSON.stringify({ email: 'test@test.com', name: 'Test User', role: 'User' }))
    localStorage.setItem('accessToken', 'test-token')
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('should display loading state initially', () => {
    mockBillByIdGet.mockImplementation(() => new Promise(() => { /* never resolves */ }))

    render(<EditBillPage />)

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('should display bill not found when bill is null', async () => {
    mockBillByIdGet.mockResolvedValue(null)

    render(<EditBillPage />)

    await waitFor(() => {
      expect(screen.getByText('Bill not found.')).toBeInTheDocument()
    })
  })

  it('should render form with bill data', async () => {
    mockBillByIdGet.mockResolvedValue(mockBill)

    render(<EditBillPage />)

    await waitFor(() => {
      const nameInput = screen.getByDisplayValue('Netflix')
      expect(nameInput).toBeInTheDocument()
    })
  })

  it('should render management URL field', async () => {
    mockBillByIdGet.mockResolvedValue(mockBill)

    render(<EditBillPage />)

    await waitFor(() => {
      const urlInput = screen.getByDisplayValue('https://netflix.com/account')
      expect(urlInput).toBeInTheDocument()
    })
  })

  it('should render frequency options', async () => {
    mockBillByIdGet.mockResolvedValue(mockBill)

    render(<EditBillPage />)

    await waitFor(() => {
      expect(screen.getByText('Monthly')).toBeInTheDocument()
    })
  })

  it('should submit form and navigate back on success', async () => {
    mockBillByIdGet.mockResolvedValue(mockBill)
    mockBillByIdPut.mockResolvedValue(undefined)

    render(<EditBillPage />)

    await waitFor(() => expect(screen.getByDisplayValue('Netflix')).toBeInTheDocument())

    const form = screen.getByText('Save changes').closest('form')
    expect(form).toBeTruthy()
    if (form) fireEvent.submit(form)

    await waitFor(() => {
      expect(mockBillByIdPut).toHaveBeenCalled()
      expect(mockPush).toHaveBeenCalledWith('/bills/1')
    })
  })

  it('should navigate back when cancel is clicked', async () => {
    mockBillByIdGet.mockResolvedValue(mockBill)

    render(<EditBillPage />)

    await waitFor(() => expect(screen.getByText('Cancel')).toBeInTheDocument())

    fireEvent.click(screen.getByText('Cancel'))

    expect(mockBack).toHaveBeenCalled()
  })
})
