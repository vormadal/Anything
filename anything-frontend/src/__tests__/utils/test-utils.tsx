import React, { ReactElement } from 'react'
import { render, RenderOptions, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PageActionsProvider, useHeaderActions } from '@/context/PageActionsContext'
import { CookingModeProvider } from '@/context/CookingModeContext'
import { useSmartBack } from '@/hooks/useSmartBack'
import { FloatingActions } from '@/components/FloatingActions'

function HeaderActionsSlot() {
  const { headerActions } = useHeaderActions()
  return <div data-testid="header-actions">{headerActions}</div>
}

function PageTitleSlot() {
  const { title } = useHeaderActions()
  return title ? <h1 data-testid="page-title">{title}</h1> : null
}

function LeftActionSlot() {
  const { leftAction } = useHeaderActions()
  const { navigateBack } = useSmartBack()
  if (!leftAction || leftAction.type !== 'back') return null
  return (
    <button aria-label="Go back" onClick={() => navigateBack(leftAction.href)} />
  )
}

function TestProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false, gcTime: 0 },
          mutations: { retry: false },
        },
      }),
  )

  return (
    <QueryClientProvider client={queryClient}>
      <PageActionsProvider>
        <CookingModeProvider>
          <LeftActionSlot />
          <PageTitleSlot />
          <HeaderActionsSlot />
          {children}
          <FloatingActions />
        </CookingModeProvider>
      </PageActionsProvider>
    </QueryClientProvider>
  )
}

export function renderWithClient(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) {
  return render(ui, { wrapper: TestProviders, ...options })
}

/**
 * Expands the floating action button's dial if the page has one and it is
 * collapsed, so its actions can be queried by role. A page with a single
 * action shows it directly and needs no expanding.
 */
export async function expandPageActions(user: { click: (el: Element) => Promise<void> }) {
  const trigger = screen.queryByRole('button', { name: 'Page actions' })
  if (trigger?.getAttribute('aria-expanded') === 'false') {
    await user.click(trigger)
  }
}

// Re-export everything from testing library
export * from '@testing-library/react'
export { renderWithClient as render }
