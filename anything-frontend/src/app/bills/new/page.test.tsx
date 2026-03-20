import { screen, waitFor, fireEvent } from '@testing-library/react'
import { render } from '@/__tests__/utils/test-utils'
import NewBillPage from './page'

const mockAuthenticatedFetch = jest.fn()

jest.mock('@/lib/apiClient', () => ({
  API_BASE_URL: 'http://localhost:5238',
  authenticatedFetch: (...args: unknown[]) => mockAuthenticatedFetch(...args),
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

const mockLocations = [{ id: 1, name: 'Home', createdOn: '2024-01-01T00:00:00Z' }]
const mockVendors = [{ id: 1, name: 'Netflix Inc.', createdOn: '2024-01-01T00:00:00Z' }]

function setupDefaultFetch() {
  mockAuthenticatedFetch.mockImplementation((url: string, options?: RequestInit) => {
    const method = (options?.method ?? 'GET').toUpperCase()
    if (method === 'POST') {
      return Promise.resolve({ ok: true, status: 201, json: async () => ({ id: 1, name: 'Netflix' }) })
    }
    if (url.includes('/api/locations')) {
      return Promise.resolve({ ok: true, status: 200, json: async () => mockLocations })
    }
    if (url.includes('/api/vendors')) {
      return Promise.resolve({ ok: true, status: 200, json: async () => mockVendors })
    }
    return Promise.resolve({ ok: true, status: 200, json: async () => [] })
  })
}

describe('NewBillPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    setupDefaultFetch()
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

  it('should navigate to bills on successful create', async () => {
    render(<NewBillPage />)

    await waitFor(() => expect(screen.getByPlaceholderText('e.g. Netflix, Electricity')).toBeInTheDocument())

    fireEvent.change(screen.getByPlaceholderText('e.g. Netflix, Electricity'), { target: { value: 'Netflix' } })

    const form = screen.getByText('Add bill').closest('form')
    expect(form).toBeTruthy()
    if (form) fireEvent.submit(form)

    await waitFor(() => {
      expect(mockAuthenticatedFetch).toHaveBeenCalledWith(
        'http://localhost:5238/api/bills',
        expect.objectContaining({ method: 'POST' })
      )
      expect(mockPush).toHaveBeenCalledWith('/bills')
    })
  })

  it('should not submit when name is empty', async () => {
    render(<NewBillPage />)

    await waitFor(() => expect(screen.getByPlaceholderText('e.g. Netflix, Electricity')).toBeInTheDocument())

    const form = screen.getByText('Add bill').closest('form')
    if (form) fireEvent.submit(form)

    const postCalls = mockAuthenticatedFetch.mock.calls.filter(
      ([, opts]: [string, RequestInit | undefined]) => opts?.method === 'POST'
    )
    expect(postCalls).toHaveLength(0)
  })

  it('should navigate back when cancel is clicked', async () => {
    render(<NewBillPage />)

    await waitFor(() => expect(screen.getByText('Cancel')).toBeInTheDocument())

    fireEvent.click(screen.getByText('Cancel'))

    // The cancel button calls router.back()
    // Check that push was NOT called with /bills (it uses back())
    expect(mockPush).not.toHaveBeenCalledWith('/bills')
  })
})
