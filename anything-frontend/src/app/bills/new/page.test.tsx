import { screen, waitFor, fireEvent } from '@testing-library/react'
import { render } from '@/__tests__/utils/test-utils'
import NewBillPage from './page'

// Mock apiClient
const mockBillPost = jest.fn()
const mockLocationsGet = jest.fn()
const mockVendorsGet = jest.fn()

jest.mock('@/lib/apiClient', () => ({
  apiClient: {
    api: {
      bills: {
        get: jest.fn(),
        post: (...args: unknown[]) => mockBillPost(...args),
        summary: { get: jest.fn() },
        byId: jest.fn(),
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
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
  usePathname: () => '/bills/new',
}))

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
  Toaster: () => null,
}))

const mockNavigateBack = jest.fn()
jest.mock('@/hooks/useSmartBack', () => ({
  useSmartBack: () => ({ navigateBack: mockNavigateBack }),
}))

describe('NewBillPage', () => {
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

  it('should render the new bill form', async () => {
    render(<NewBillPage />)

    await waitFor(() => {
      expect(screen.getByPlaceholderText('e.g. Netflix, Electricity')).toBeInTheDocument()
    })
  })

  it('should render frequency select with Monthly as default', async () => {
    render(<NewBillPage />)

    await waitFor(() => {
      expect(screen.getAllByText('Monthly').length).toBeGreaterThanOrEqual(1)
    })
  })

  it('should default to Recurring with the variable amount checkbox visible', async () => {
    render(<NewBillPage />)

    await waitFor(() => {
      expect(screen.getByText('Amount varies each period')).toBeInTheDocument()
    })
  })

  it('should hide frequency and variable amount when One-time is selected', async () => {
    render(<NewBillPage />)

    await waitFor(() => expect(screen.getByText('One-time')).toBeInTheDocument())
    fireEvent.click(screen.getByText('One-time'))

    expect(screen.queryByLabelText('Frequency')).not.toBeInTheDocument()
    expect(screen.queryByText('Amount varies each period')).not.toBeInTheDocument()
  })

  it('should submit isRecurring: false and Frequency: None for a one-time bill', async () => {
    mockBillPost.mockResolvedValue({ id: 1, name: 'Gift' })

    render(<NewBillPage />)

    await waitFor(() => expect(screen.getByPlaceholderText('e.g. Netflix, Electricity')).toBeInTheDocument())

    fireEvent.change(screen.getByPlaceholderText('e.g. Netflix, Electricity'), { target: { value: 'Gift' } })
    fireEvent.click(screen.getByText('One-time'))

    const form = screen.getByText('Add bill').closest('form')
    if (form) fireEvent.submit(form)

    await waitFor(() => {
      expect(mockBillPost).toHaveBeenCalledWith(expect.objectContaining({
        isRecurring: false,
        frequency: 'None',
        hasVariableAmount: false,
      }))
    })
  })

  it('should navigate to bills on successful create', async () => {
    mockBillPost.mockResolvedValue({ id: 1, name: 'Netflix' })

    render(<NewBillPage />)

    await waitFor(() => expect(screen.getByPlaceholderText('e.g. Netflix, Electricity')).toBeInTheDocument())

    fireEvent.change(screen.getByPlaceholderText('e.g. Netflix, Electricity'), { target: { value: 'Netflix' } })

    const form = screen.getByText('Add bill').closest('form')
    expect(form).toBeTruthy()
    if (form) fireEvent.submit(form)

    await waitFor(() => {
      expect(mockBillPost).toHaveBeenCalled()
      expect(mockPush).toHaveBeenCalledWith('/bills')
    })
  })

  it('should not submit when name is empty', async () => {
    render(<NewBillPage />)

    await waitFor(() => expect(screen.getByPlaceholderText('e.g. Netflix, Electricity')).toBeInTheDocument())

    const form = screen.getByText('Add bill').closest('form')
    if (form) fireEvent.submit(form)

    expect(mockBillPost).not.toHaveBeenCalled()
  })

  it('should navigate back when cancel is clicked', async () => {
    render(<NewBillPage />)

    await waitFor(() => expect(screen.getByText('Cancel')).toBeInTheDocument())

    fireEvent.click(screen.getByText('Cancel'))

    expect(mockNavigateBack).toHaveBeenCalledWith('/bills')
  })

  describe('offline', () => {
    function setOnline(value: boolean) {
      Object.defineProperty(navigator, 'onLine', { configurable: true, value })
    }

    afterEach(() => {
      setOnline(true)
    })

    it('disables Add bill while offline', async () => {
      setOnline(false)
      render(<NewBillPage />)

      await waitFor(() => expect(screen.getByText('Add bill')).toBeInTheDocument())
      expect(screen.getByText('Add bill')).toBeDisabled()
    })
  })
})
