import { render } from '@/__tests__/utils/test-utils'
import NewFoodPlanPage from './page'

// Mock next/navigation
const mockReplace = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn(), back: jest.fn() }),
  useParams: () => ({}),
  usePathname: () => '/food-plans/new',
}))

describe('NewFoodPlanPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should redirect to /food-plans', () => {
    render(<NewFoodPlanPage />)

    expect(mockReplace).toHaveBeenCalledWith('/food-plans')
  })
})
