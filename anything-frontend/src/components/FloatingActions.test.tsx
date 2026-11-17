import { useState } from 'react'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CalendarPlus, Pencil, Plus, ShoppingCart } from 'lucide-react'
import { renderWithClient } from '@/__tests__/utils/test-utils'
import { usePageActions } from '@/hooks/usePageActions'
import type { PageAction } from '@/context/PageActionsContext'

jest.mock('next/navigation', () => ({
  usePathname: () => '/somewhere',
  useRouter: () => ({ push: jest.fn() }),
}))

function Actions({ actions }: { actions: PageAction[] }) {
  usePageActions(actions)
  return null
}

const TRIGGER = { name: 'Page actions' }

describe('FloatingActions', () => {
  it('renders nothing when the page has no actions', () => {
    renderWithClient(<Actions actions={[]} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('shows a single action directly as a labelled button', async () => {
    const onSelect = jest.fn()
    renderWithClient(<Actions actions={[{ label: 'New list', icon: Plus, onSelect }]} />)

    await userEvent.setup().click(await screen.findByRole('button', { name: 'New list' }))

    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('button', TRIGGER)).not.toBeInTheDocument()
  })

  it('renders an href action as a link', async () => {
    renderWithClient(<Actions actions={[{ label: 'New recipe', icon: Plus, href: '/recipes/new' }]} />)
    expect(await screen.findByRole('link', { name: 'New recipe' })).toHaveAttribute('href', '/recipes/new')
  })

  it('collapses several actions behind a + button that expands and runs the chosen one', async () => {
    const user = userEvent.setup()
    const addToPlan = jest.fn()
    renderWithClient(
      <Actions
        actions={[
          { label: 'Add to food plan', icon: CalendarPlus, onSelect: addToPlan },
          { label: 'Edit recipe', icon: Pencil, onSelect: jest.fn() },
        ]}
      />,
    )

    const trigger = await screen.findByRole('button', TRIGGER)
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('button', { name: 'Add to food plan' })).not.toBeInTheDocument()

    await user.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    await user.click(screen.getByRole('button', { name: 'Add to food plan' }))

    expect(addToPlan).toHaveBeenCalledTimes(1)
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('closes on the scrim and on Escape, returning focus to the trigger', async () => {
    const user = userEvent.setup()
    renderWithClient(
      <Actions
        actions={[
          { label: 'One', icon: Plus, onSelect: jest.fn() },
          { label: 'Two', icon: Plus, onSelect: jest.fn() },
        ]}
      />,
    )
    const trigger = await screen.findByRole('button', TRIGGER)

    await user.click(trigger)
    await user.click(screen.getByTestId('page-actions-scrim'))
    expect(screen.queryByRole('button', { name: 'One' })).not.toBeInTheDocument()

    await user.click(trigger)
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('button', { name: 'One' })).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('puts primary actions first, nearest the + button', async () => {
    const user = userEvent.setup()
    renderWithClient(
      <>
        <Actions actions={[{ label: 'Edit items', icon: Pencil, onSelect: jest.fn() }]} />
        <Actions actions={[{ label: 'Complete list', icon: ShoppingCart, onSelect: jest.fn(), primary: true }]} />
      </>,
    )

    await user.click(await screen.findByRole('button', TRIGGER))

    const labels = Array.from(document.querySelectorAll('#page-actions-menu > *')).map((el) => el.textContent)
    // The menu is a column-reverse stack, so DOM order = nearest the trigger first.
    expect(labels).toEqual(['Complete list', 'Edit items'])
  })

  it('disables an action and explains why', async () => {
    renderWithClient(
      <Actions
        actions={[
          { label: 'New list', icon: Plus, onSelect: jest.fn(), disabled: true, disabledReason: 'Offline' },
        ]}
      />,
    )
    const button = await screen.findByRole('button', { name: 'New list' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('title', 'Offline')
  })

  it('calls the latest callback without re-registering, and removes actions on unmount', async () => {
    const user = userEvent.setup()
    const seen: number[] = []

    function Counter() {
      const [count, setCount] = useState(0)
      const [shown, setShown] = useState(true)
      return (
        <>
          <button onClick={() => setCount((c) => c + 1)}>bump</button>
          <button onClick={() => setShown(false)}>hide</button>
          {shown && <Actions actions={[{ label: 'Report', icon: Plus, onSelect: () => seen.push(count) }]} />}
        </>
      )
    }

    renderWithClient(<Counter />)
    await user.click(screen.getByRole('button', { name: 'bump' }))
    await user.click(screen.getByRole('button', { name: 'bump' }))
    await user.click(await screen.findByRole('button', { name: 'Report' }))
    expect(seen).toEqual([2])

    await user.click(screen.getByRole('button', { name: 'hide' }))
    expect(screen.queryByRole('button', { name: 'Report' })).not.toBeInTheDocument()
  })
})
