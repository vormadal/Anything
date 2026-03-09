import { renderHook, act } from '@testing-library/react'
import { useSmartBack } from './useSmartBack'

const mockPush = jest.fn()
const mockBack = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
  usePathname: () => '/test',
}))

describe('useSmartBack', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    Object.defineProperty(document, 'referrer', {
      value: '',
      configurable: true,
    })
  })

  it('calls router.push with fallbackHref when there is no in-app history and no same-domain referrer', () => {
    const { result } = renderHook(() => useSmartBack())

    act(() => {
      result.current.navigateBack('/fallback')
    })

    expect(mockPush).toHaveBeenCalledWith('/fallback')
    expect(mockBack).not.toHaveBeenCalled()
  })

  it('calls router.back when referrer is on the same domain', () => {
    // JSDOM's window.location.origin is 'http://localhost' by default
    Object.defineProperty(document, 'referrer', {
      value: 'http://localhost/recipes',
      configurable: true,
    })

    const { result } = renderHook(() => useSmartBack())

    act(() => {
      result.current.navigateBack('/fallback')
    })

    expect(mockBack).toHaveBeenCalled()
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('calls router.push when referrer is from a different domain', () => {
    Object.defineProperty(document, 'referrer', {
      value: 'https://external.example.com/page',
      configurable: true,
    })

    const { result } = renderHook(() => useSmartBack())

    act(() => {
      result.current.navigateBack('/fallback')
    })

    expect(mockPush).toHaveBeenCalledWith('/fallback')
    expect(mockBack).not.toHaveBeenCalled()
  })
})
