import {
  addRecentSearch,
  clearRecentSearches,
  filterRecentSearches,
  getRecentSearches,
  MAX_RECENT_SEARCHES,
  RECENT_SEARCHES_KEY,
  removeRecentSearch,
  subscribeRecentSearches,
} from './recentSearches'

describe('recentSearches', () => {
  afterEach(() => localStorage.clear())

  it('puts the latest search first and de-duplicates case-insensitively', () => {
    addRecentSearch('pasta')
    addRecentSearch('lights')
    addRecentSearch('  Pasta ')
    expect(getRecentSearches()).toEqual(['Pasta', 'lights'])
  })

  it('ignores blank terms', () => {
    addRecentSearch('   ')
    expect(getRecentSearches()).toEqual([])
  })

  it('caps the history', () => {
    for (let i = 0; i < MAX_RECENT_SEARCHES + 3; i++) addRecentSearch(`term ${i}`)
    const list = getRecentSearches()
    expect(list).toHaveLength(MAX_RECENT_SEARCHES)
    expect(list[0]).toBe(`term ${MAX_RECENT_SEARCHES + 2}`)
  })

  it('removes a single term and clears all', () => {
    addRecentSearch('a')
    addRecentSearch('b')
    removeRecentSearch('a')
    expect(getRecentSearches()).toEqual(['b'])
    clearRecentSearches()
    expect(getRecentSearches()).toEqual([])
    expect(localStorage.getItem(RECENT_SEARCHES_KEY)).toBeNull()
  })

  it('tolerates corrupt storage', () => {
    localStorage.setItem(RECENT_SEARCHES_KEY, '{not json')
    expect(getRecentSearches()).toEqual([])
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(['ok', 3, null]))
    expect(getRecentSearches()).toEqual(['ok'])
  })

  it('returns a stable reference while storage is unchanged', () => {
    addRecentSearch('x')
    expect(getRecentSearches()).toBe(getRecentSearches())
  })

  it('notifies subscribers on change', () => {
    const listener = jest.fn()
    const unsubscribe = subscribeRecentSearches(listener)
    addRecentSearch('x')
    expect(listener).toHaveBeenCalledTimes(1)
    unsubscribe()
    addRecentSearch('y')
    expect(listener).toHaveBeenCalledTimes(1)
  })

  describe('filterRecentSearches', () => {
    const list = ['Pasta carbonara', 'pasta', 'lights']

    it('returns everything for a blank query', () => {
      expect(filterRecentSearches(list, '  ')).toBe(list)
    })

    it('matches by substring and drops the exact match', () => {
      expect(filterRecentSearches(list, 'PASTA')).toEqual(['Pasta carbonara'])
    })
  })
})
