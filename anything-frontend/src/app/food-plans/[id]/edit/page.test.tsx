import { render } from '@/__tests__/utils/test-utils'
import EditFoodPlanPage from './page'

// Mock next/navigation
const mockReplace = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn(), back: jest.fn() }),
  useParams: () => ({ id: '1' }),
  usePathname: () => '/food-plans/1/edit',
}))

describe('EditFoodPlanPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should redirect to settings page', () => {
    render(<EditFoodPlanPage />)

    expect(mockReplace).toHaveBeenCalledWith('/food-plans/settings')
  })
})
