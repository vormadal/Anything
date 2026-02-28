import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PageActionsProvider, useHeaderActions } from '@/context/PageActionsContext'

function HeaderActionsSlot() {
  const { headerActions } = useHeaderActions()
  return <div data-testid="header-actions">{headerActions}</div>
}

function TestProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      }),
  )

  return (
    <QueryClientProvider client={queryClient}>
      <PageActionsProvider>
        <HeaderActionsSlot />
        {children}
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

// Re-export everything from testing library
export * from '@testing-library/react'
export { renderWithClient as render }
