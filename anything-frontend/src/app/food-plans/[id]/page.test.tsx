import { render } from '@/__tests__/utils/test-utils'
import FoodPlanDetailPage from './page'

// Mock next/navigation
const mockReplace = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn(), back: jest.fn() }),
  useParams: () => ({ id: '1' }),
  usePathname: () => '/food-plans/1',
}))

describe('FoodPlanDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should redirect to /food-plans', () => {
    render(<FoodPlanDetailPage />)

    expect(mockReplace).toHaveBeenCalledWith('/food-plans')
  })
})
