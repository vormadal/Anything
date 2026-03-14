import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@/__tests__/utils/test-utils'
import FoodPlanSettingsPage from './page'
import { toast } from 'sonner'

// Mock the apiClient module
const mockSettingsGet = jest.fn()
const mockSettingsPut = jest.fn()

jest.mock('@/lib/apiClient', () => ({
  apiClient: {
    api: {
      foodPlan: {
        settings: {
          get: (...args: unknown[]) => mockSettingsGet(...args),
          put: (...args: unknown[]) => mockSettingsPut(...args),
        },
      },
    },
  },
}))

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useParams: () => ({}),
  usePathname: () => '/food-plans/settings',
}))

// Mock useAuth
jest.mock('@/hooks/useAuth', () => ({
  useCurrentUser: () => ({ data: null }),
  useLogout: () => ({ mutateAsync: jest.fn(), isPending: false }),
}))

// Mock toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
  Toaster: () => null,
}))

describe('FoodPlanSettingsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSettingsGet.mockResolvedValue({ activeDays: 31 })
    mockSettingsPut.mockResolvedValue(undefined)
  })

  it('should display loading state', () => {
    mockSettingsGet.mockImplementation(() => new Promise(() => {}))

    render(<FoodPlanSettingsPage />)

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('should render day checkboxes with abbreviations', async () => {
    render(<FoodPlanSettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('Food Plan Settings')).toBeInTheDocument()
    })

    expect(screen.getByText('Mon')).toBeInTheDocument()
    expect(screen.getByText('Tue')).toBeInTheDocument()
    expect(screen.getByText('Wed')).toBeInTheDocument()
    expect(screen.getByText('Thu')).toBeInTheDocument()
    expect(screen.getByText('Fri')).toBeInTheDocument()
    expect(screen.getByText('Sat')).toBeInTheDocument()
    expect(screen.getByText('Sun')).toBeInTheDocument()
  })

  it('should have Mon-Fri selected by default when activeDays=31', async () => {
    render(<FoodPlanSettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('Food Plan Settings')).toBeInTheDocument()
    })

    const checkboxes = screen.getAllByRole('checkbox')
    // activeDays=31 is bitmask 0b0011111, meaning indices 0-4 (Mon-Fri)
    expect(checkboxes[0]).toBeChecked() // Mon
    expect(checkboxes[1]).toBeChecked() // Tue
    expect(checkboxes[2]).toBeChecked() // Wed
    expect(checkboxes[3]).toBeChecked() // Thu
    expect(checkboxes[4]).toBeChecked() // Fri
    expect(checkboxes[5]).not.toBeChecked() // Sat
    expect(checkboxes[6]).not.toBeChecked() // Sun
  })

  it('should toggle a day checkbox when clicked', async () => {
    const user = userEvent.setup()

    render(<FoodPlanSettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('Food Plan Settings')).toBeInTheDocument()
    })

    const checkboxes = screen.getAllByRole('checkbox')
    // Sat (index 5) should be unchecked initially
    expect(checkboxes[5]).not.toBeChecked()

    // Click Sat label to toggle it on
    await user.click(screen.getByText('Sat'))

    expect(checkboxes[5]).toBeChecked()

    // Click again to toggle it off
    await user.click(screen.getByText('Sat'))

    expect(checkboxes[5]).not.toBeChecked()
  })

  it('should save settings when form is submitted', async () => {
    const user = userEvent.setup()

    render(<FoodPlanSettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('Food Plan Settings')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Save Settings' }))

    await waitFor(() => {
      expect(mockSettingsPut).toHaveBeenCalledWith({ activeDays: 31 })
    })

    expect(toast.success).toHaveBeenCalledWith('Settings updated')
  })

  it('should show error toast when save fails', async () => {
    const user = userEvent.setup()
    mockSettingsPut.mockRejectedValueOnce(new Error('Server error'))

    render(<FoodPlanSettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('Food Plan Settings')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Save Settings' }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to update settings. Please try again.')
    })
  })

  it('should disable save button when no days are selected', async () => {
    const user = userEvent.setup()
    mockSettingsGet.mockResolvedValue({ activeDays: 1 }) // Only Monday selected

    render(<FoodPlanSettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('Food Plan Settings')).toBeInTheDocument()
    })

    // Uncheck the only selected day (Mon)
    await user.click(screen.getByText('Mon'))

    expect(screen.getByRole('button', { name: 'Save Settings' })).toBeDisabled()
  })

  it('should set the left action to back on mount', () => {
    render(<FoodPlanSettingsPage />)

    expect(screen.getByRole('button', { name: 'Go back' })).toBeInTheDocument()
  })
})
