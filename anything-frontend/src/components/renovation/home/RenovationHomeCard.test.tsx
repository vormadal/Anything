import { render, screen } from '@testing-library/react'
import { RenovationHomeCard, budgetStatus, mostRecentProject } from './RenovationHomeCard'

const mockProjectsQuery = jest.fn()
jest.mock('@/hooks/useRenovation', () => ({
  useRenovationProjects: () => mockProjectsQuery(),
}))

function query(overrides: Record<string, unknown> = {}) {
  return {
    data: undefined,
    isLoading: false,
    isError: false,
    isPaused: false,
    isFetching: false,
    refetch: jest.fn(),
    ...overrides,
  }
}

describe('mostRecentProject', () => {
  it('picks the project with the latest modifiedOn', () => {
    const projects = [
      { id: 1, name: 'A', modifiedOn: new Date('2026-01-01T00:00:00Z') },
      { id: 2, name: 'B', modifiedOn: new Date('2026-03-01T00:00:00Z') },
      { id: 3, name: 'C', modifiedOn: new Date('2025-12-01T00:00:00Z') },
    ]
    expect(mostRecentProject(projects)?.id).toBe(2)
  })

  it('falls back to createdOn when modifiedOn is missing', () => {
    const projects = [
      { id: 1, name: 'A', createdOn: new Date('2026-05-01T00:00:00Z') },
      { id: 2, name: 'B', modifiedOn: null, createdOn: new Date('2026-02-01T00:00:00Z') },
    ]
    expect(mostRecentProject(projects)?.id).toBe(1)
  })

  it('returns undefined for an empty list', () => {
    expect(mostRecentProject([])).toBeUndefined()
  })
})

describe('budgetStatus', () => {
  it('is on track while the forecast fits the budget', () => {
    expect(budgetStatus(900, 1000)?.label).toBe('On track')
    expect(budgetStatus(1000, 1000)?.label).toBe('On track')
  })

  it('is over budget once the forecast exceeds it', () => {
    expect(budgetStatus(1001, 1000)?.label).toBe('Over budget')
  })

  it('has no status without a positive budget', () => {
    expect(budgetStatus(500, null)).toBeNull()
    expect(budgetStatus(500, undefined)).toBeNull()
    expect(budgetStatus(500, 0)).toBeNull()
  })
})

describe('RenovationHomeCard', () => {
  beforeEach(() => {
    mockProjectsQuery.mockReset()
  })

  it('shows the latest project with its forecast, budget and status', () => {
    mockProjectsQuery.mockReturnValue(
      query({
        data: [
          { id: 9, name: 'Kitchen refit', budget: 150000, forecast: 160000, roomCount: 2, modifiedOn: new Date('2026-06-01') },
          { id: 4, name: 'Bathroom', budget: 50000, forecast: 1000, roomCount: 1, modifiedOn: new Date('2025-01-01') },
        ],
      }),
    )

    render(<RenovationHomeCard />)

    expect(screen.getByRole('heading', { name: 'Renovation' })).toBeInTheDocument()
    expect(screen.getByText('Kitchen refit')).toBeInTheDocument()
    expect(screen.getByText('2 rooms')).toBeInTheDocument()
    expect(screen.getByText('Over budget')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Kitchen refit/ })).toHaveAttribute('href', '/renovation/9')
    expect(screen.getByRole('link', { name: 'All projects →' })).toHaveAttribute('href', '/renovation')
  })

  it('shows "No budget set" and no status when the project has no budget', () => {
    mockProjectsQuery.mockReturnValue(
      query({ data: [{ id: 3, name: 'Shed', budget: null, forecast: 4000, roomCount: 0 }] }),
    )

    render(<RenovationHomeCard />)

    expect(screen.getByText('No budget set')).toBeInTheDocument()
    expect(screen.queryByText('On track')).not.toBeInTheDocument()
    expect(screen.queryByText('Over budget')).not.toBeInTheDocument()
  })

  it('links to the renovation area from the empty state', () => {
    mockProjectsQuery.mockReturnValue(query({ data: [] }))

    render(<RenovationHomeCard />)

    expect(screen.getByText('No renovation projects yet')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Start a renovation project' })).toHaveAttribute('href', '/renovation')
  })

  it('shows a load error rather than the empty state when the request fails', () => {
    mockProjectsQuery.mockReturnValue(query({ isError: true }))

    render(<RenovationHomeCard />)

    expect(screen.getByText("Couldn't load renovation projects")).toBeInTheDocument()
    expect(screen.queryByText('No renovation projects yet')).not.toBeInTheDocument()
  })

  it('shows a load error when the query is paused offline before it ever ran', () => {
    mockProjectsQuery.mockReturnValue(query({ isPaused: true }))

    render(<RenovationHomeCard />)

    expect(screen.getByText("Couldn't load renovation projects")).toBeInTheDocument()
  })

  it('shows a loading state while the first request is in flight', () => {
    mockProjectsQuery.mockReturnValue(query({ isLoading: true }))

    render(<RenovationHomeCard />)

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })
})
