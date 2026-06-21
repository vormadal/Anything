import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@/__tests__/utils/test-utils'
import { ShareRecipeDialog } from './ShareRecipeDialog'

const mockApiFetch = jest.fn()
jest.mock('@/lib/apiClient', () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
  apiClient: {
    api: {
      households: {
        get: jest.fn().mockResolvedValue([]),
      },
    },
  },
}))

jest.mock('@/hooks/useHouseholds', () => ({
  useHouseholds: () => ({ data: [] }),
}))

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
  Toaster: () => null,
}))

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useParams: () => ({}),
  usePathname: () => '/',
  useSearchParams: () => ({ get: jest.fn() }),
}))

const defaultProps = {
  recipeId: 1,
  open: true,
  onOpenChange: jest.fn(),
}

describe('ShareRecipeDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockApiFetch.mockResolvedValue({ ok: true, json: async () => [] })
  })

  it('matches snapshot: initial state with no shares', async () => {
    const { container } = render(<ShareRecipeDialog {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByText('Share recipe')).toBeInTheDocument()
    })
    expect(container.firstChild).toMatchSnapshot()
  })

  it('matches snapshot: public link tab with generated link', async () => {
    const newShare = {
      id: 1,
      token: 'abc123',
      shareUrl: '/shared/recipe/abc123',
      targetEmail: null,
      expiresAt: '2025-01-28T00:00:00Z',
      createdOn: '2025-01-21T00:00:00Z',
      isExpired: false,
      isClaimed: false,
    }
    mockApiFetch
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({ ok: true, json: async () => newShare })
      .mockResolvedValue({ ok: true, json: async () => [newShare] })

    const { container } = render(<ShareRecipeDialog {...defaultProps} />)
    await waitFor(() => expect(screen.getByText('Generate link')).toBeInTheDocument())

    await userEvent.click(screen.getByText('Generate link'))

    await waitFor(() => {
      expect(screen.getByLabelText('Generated share link')).toBeInTheDocument()
    })
    expect(container.firstChild).toMatchSnapshot()
  })

  it('matches snapshot: user share tab', async () => {
    mockApiFetch.mockResolvedValue({ ok: true, json: async () => [] })

    const { container } = render(<ShareRecipeDialog {...defaultProps} />)
    await waitFor(() => expect(screen.getByText('Share with user')).toBeInTheDocument())

    await userEvent.click(screen.getByText('Share with user'))

    expect(container.firstChild).toMatchSnapshot()
  })

  it('matches snapshot: existing shares listed', async () => {
    const shares = [
      {
        id: 1,
        token: 'abc123',
        shareUrl: '/shared/recipe/abc123',
        targetEmail: null,
        expiresAt: '2025-02-21T00:00:00Z',
        createdOn: '2025-01-21T00:00:00Z',
        isExpired: false,
        isClaimed: false,
      },
      {
        id: 2,
        token: 'xyz789',
        shareUrl: '/shared/recipe/xyz789',
        targetEmail: 'friend@example.com',
        expiresAt: null,
        createdOn: '2025-01-21T00:00:00Z',
        isExpired: false,
        isClaimed: false,
      },
    ]
    mockApiFetch.mockResolvedValue({ ok: true, json: async () => shares })

    const { container } = render(<ShareRecipeDialog {...defaultProps} />)
    await waitFor(() => expect(screen.getByText('Public link')).toBeInTheDocument())
    await waitFor(() => expect(screen.getByText('Public link')).toBeVisible())

    expect(container.firstChild).toMatchSnapshot()
  })
})
