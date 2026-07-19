import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@/__tests__/utils/test-utils'
import FoodPlanSettingsPage from './page'
import { toast } from 'sonner'

// Mock the apiClient module
const mockSettingsGet = jest.fn()
const mockSettingsPut = jest.fn()
const mockRulesGet = jest.fn()
const mockRulesPost = jest.fn()
const mockRulesPut = jest.fn()
const mockRulesDelete = jest.fn()
const mockRulesByRuleId: jest.Mock = jest.fn(() => ({ put: mockRulesPut, delete: mockRulesDelete }))

jest.mock('@/lib/apiClient', () => ({
  apiClient: {
    api: {
      foodPlan: {
        settings: {
          get: (...args: unknown[]) => mockSettingsGet(...args),
          put: (...args: unknown[]) => mockSettingsPut(...args),
        },
        seasonalTags: {
          get: (...args: unknown[]) => mockRulesGet(...args),
          post: (...args: unknown[]) => mockRulesPost(...args),
          byRuleId: (...args: unknown[]) => mockRulesByRuleId(...args),
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
    mockRulesGet.mockResolvedValue([])
    mockRulesPost.mockResolvedValue({})
    mockRulesPut.mockResolvedValue({})
    mockRulesDelete.mockResolvedValue(undefined)
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

  // ------- Suggestion tuning -------

  it('should render tuning fields with values from settings', async () => {
    mockSettingsGet.mockResolvedValue({
      activeDays: 31,
      suggestionRotationWeight: 50,
      suggestionExclusionWindowDays: 13,
    })

    render(<FoodPlanSettingsPage />)

    await waitFor(() => {
      expect(screen.getByLabelText('Rotation weight')).toHaveValue(50)
    })
    expect(screen.getByLabelText('Exclusion window (days)')).toHaveValue(13)
    // Fields missing from the response fall back to defaults
    expect(screen.getByLabelText('Favorites weight')).toHaveValue(25)
  })

  it('should save tuning together with the current active days', async () => {
    const user = userEvent.setup()

    render(<FoodPlanSettingsPage />)

    await waitFor(() => {
      expect(screen.getByLabelText('Rotation weight')).toBeInTheDocument()
    })

    const rotationInput = screen.getByLabelText('Rotation weight')
    await user.clear(rotationInput)
    await user.type(rotationInput, '60')
    await user.click(screen.getByRole('button', { name: 'Save Tuning' }))

    await waitFor(() => {
      expect(mockSettingsPut).toHaveBeenCalledWith(
        expect.objectContaining({ activeDays: 31, suggestionRotationWeight: 60 }),
      )
    })
    expect(toast.success).toHaveBeenCalledWith('Settings updated')
  })

  it('should reset tuning to defaults', async () => {
    const user = userEvent.setup()
    mockSettingsGet.mockResolvedValue({ activeDays: 31, suggestionRotationWeight: 77 })

    render(<FoodPlanSettingsPage />)

    await waitFor(() => {
      expect(screen.getByLabelText('Rotation weight')).toHaveValue(77)
    })

    await user.click(screen.getByRole('button', { name: 'Reset to defaults' }))

    await waitFor(() => {
      expect(mockSettingsPut).toHaveBeenCalledWith(
        expect.objectContaining({
          activeDays: 31,
          suggestionRotationWeight: 40,
          suggestionFavoritesWeight: 25,
          suggestionSeasonalityWeight: 20,
          suggestionExclusionWindowDays: 6,
          suggestionRotationSaturationDays: 84,
          suggestionSeasonalityWindowDays: 21,
        }),
      )
    })
    expect(screen.getByLabelText('Rotation weight')).toHaveValue(40)
  })

  // ------- Seasonal tags -------

  it('should list seasonal tag rules with their months', async () => {
    mockRulesGet.mockResolvedValue([
      { id: 1, keyword: 'jul', matchPrefix: false, months: 1 << 11, boost: 15 },
      { id: 2, keyword: 'jule', matchPrefix: true, months: 1 << 11, boost: 15 },
    ])

    render(<FoodPlanSettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('jul')).toBeInTheDocument()
    })
    expect(screen.getByText('jule')).toBeInTheDocument()
    expect(screen.getByText('prefix')).toBeInTheDocument()
    expect(screen.getAllByText(/\+15 · Dec/).length).toBe(2)
  })

  it('should create a rule with the selected months as a bitmask', async () => {
    const user = userEvent.setup()

    render(<FoodPlanSettingsPage />)

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Tag keyword, e.g. jul')).toBeInTheDocument()
    })

    await user.type(screen.getByPlaceholderText('Tag keyword, e.g. jul'), 'sommer')
    await user.click(screen.getByText('Jun'))
    await user.click(screen.getByText('Jul'))
    await user.click(screen.getByText('Aug'))
    await user.click(screen.getByRole('button', { name: 'Add tag' }))

    await waitFor(() => {
      expect(mockRulesPost).toHaveBeenCalledWith({
        keyword: 'sommer',
        matchPrefix: false,
        months: (1 << 5) | (1 << 6) | (1 << 7),
        boost: 10,
      })
    })
  })

  it('should edit an existing rule and round-trip its month bitmask', async () => {
    const user = userEvent.setup()
    mockRulesGet.mockResolvedValue([
      { id: 5, keyword: 'vinter', matchPrefix: false, months: (1 << 11) | 1 | (1 << 1), boost: 10 },
    ])

    render(<FoodPlanSettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('vinter')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Edit' }))

    expect(screen.getByPlaceholderText('Tag keyword, e.g. jul')).toHaveValue('vinter')

    // Toggle Mar on — Dec, Jan and Feb stay selected from the loaded bitmask
    await user.click(screen.getByText('Mar'))
    await user.click(screen.getByRole('button', { name: 'Update tag' }))

    await waitFor(() => {
      expect(mockRulesByRuleId).toHaveBeenCalledWith(5)
      expect(mockRulesPut).toHaveBeenCalledWith({
        keyword: 'vinter',
        matchPrefix: false,
        months: (1 << 11) | 1 | (1 << 1) | (1 << 2),
        boost: 10,
      })
    })
  })

  it('should delete a rule', async () => {
    const user = userEvent.setup()
    mockRulesGet.mockResolvedValue([
      { id: 7, keyword: 'jul', matchPrefix: false, months: 1 << 11, boost: 15 },
    ])

    render(<FoodPlanSettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('jul')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Remove seasonal tag jul' }))

    await waitFor(() => {
      expect(mockRulesByRuleId).toHaveBeenCalledWith(7)
      expect(mockRulesDelete).toHaveBeenCalled()
    })
  })

  describe('offline', () => {
    function setOnline(value: boolean) {
      Object.defineProperty(navigator, 'onLine', { configurable: true, value })
    }

    afterEach(() => {
      setOnline(true)
    })

    it('disables settings, tuning, and seasonal-tag controls while offline', async () => {
      mockRulesGet.mockResolvedValue([
        { id: 7, keyword: 'jul', matchPrefix: false, months: 1 << 11, boost: 15 },
      ])
      setOnline(false)

      render(<FoodPlanSettingsPage />)

      await waitFor(() => {
        expect(screen.getByText('jul')).toBeInTheDocument()
      })

      expect(screen.getByRole('button', { name: 'Save Settings' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Save Tuning' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Reset to defaults' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Remove seasonal tag jul' })).toBeDisabled()
    })
  })
})
