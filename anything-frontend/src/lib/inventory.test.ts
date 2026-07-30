import {
  boxesInPlace,
  childPlaces,
  describeItemLocation,
  describeWarranty,
  eligibleParentPlaces,
  formatBoxName,
  formatPlaceBreadcrumb,
  formatPlaceName,
  itemsInBox,
  itemsInPlace,
  looseItemsInPlace,
  nextBoxNumber,
  resolvePlacement,
  topLevelPlaces,
  unplacedItems,
} from '@/lib/inventory'
import type {
  InventoryBoxResponse,
  InventoryItemSummaryResponse,
  InventoryStorageUnitResponse,
} from '@/lib/api-client/models/index'

const summerhouse: InventoryStorageUnitResponse = { id: 1, name: 'Summerhouse' }
const basement: InventoryStorageUnitResponse = { id: 2, name: 'Basement storage room' }
const places = [summerhouse, basement]

const boxInSummerhouse: InventoryBoxResponse = { id: 10, number: 4, storageUnitId: 1 }
const boxInBasement: InventoryBoxResponse = { id: 11, number: 7, storageUnitId: 2 }
const homelessBox: InventoryBoxResponse = { id: 12, number: 9, storageUnitId: null }
const boxes = [boxInSummerhouse, boxInBasement, homelessBox]

describe('inventory helpers', () => {
  describe('formatting', () => {
    it('names a box by the number written on it', () => {
      expect(formatBoxName({ number: 4 })).toBe('Box 4')
    })

    it('falls back when a box somehow has no number', () => {
      expect(formatBoxName({ number: null })).toBe('Box ?')
    })

    it('shows the label instead of the "Box" prefix when the box has one', () => {
      expect(formatBoxName({ number: 4, label: 'Christmas decorations' })).toBe(
        'Christmas decorations #4'
      )
    })

    it('falls back to the number placeholder alongside the label when the box has no number', () => {
      expect(formatBoxName({ number: null, label: 'Christmas decorations' })).toBe(
        'Christmas decorations #?'
      )
    })

    it('falls back when a place has no name', () => {
      expect(formatPlaceName({ name: null })).toBe('Unnamed place')
    })
  })

  describe('grouping', () => {
    const items: InventoryItemSummaryResponse[] = [
      { id: 100, name: 'Christmas lights', boxId: 10, storageUnitId: 1 },
      { id: 101, name: 'Deck chair', boxId: null, storageUnitId: 1 },
      { id: 102, name: 'Paint tins', boxId: 11, storageUnitId: 2 },
      { id: 103, name: 'Tent', boxId: null, storageUnitId: null },
    ]

    it('finds the boxes in a place', () => {
      expect(boxesInPlace(boxes, 1)).toEqual([boxInSummerhouse])
    })

    it('finds the items in a box', () => {
      expect(itemsInBox(items, 10).map((i) => i.name)).toEqual(['Christmas lights'])
    })

    it('counts every item in a place, boxed or not', () => {
      expect(itemsInPlace(items, 1).map((i) => i.name)).toEqual([
        'Christmas lights',
        'Deck chair',
      ])
    })

    it('separates loose items from boxed ones', () => {
      expect(looseItemsInPlace(items, 1).map((i) => i.name)).toEqual(['Deck chair'])
    })

    it('surfaces items with no place at all', () => {
      expect(unplacedItems(items).map((i) => i.name)).toEqual(['Tent'])
    })
  })

  describe('resolvePlacement', () => {
    it('takes the place from the chosen box, ignoring a contradictory one', () => {
      expect(
        resolvePlacement({ boxId: 10, storageUnitId: 2 }, boxes)
      ).toEqual({ boxId: 10, storageUnitId: 1 })
    })

    it('keeps the chosen place when no box is selected', () => {
      expect(
        resolvePlacement({ boxId: null, storageUnitId: 2 }, boxes)
      ).toEqual({ boxId: null, storageUnitId: 2 })
    })

    it('clears the place for a box that has none', () => {
      expect(
        resolvePlacement({ boxId: 12, storageUnitId: 1 }, boxes)
      ).toEqual({ boxId: 12, storageUnitId: null })
    })

    it('leaves an item unplaced when neither is chosen', () => {
      expect(
        resolvePlacement({ boxId: null, storageUnitId: null }, boxes)
      ).toEqual({ boxId: null, storageUnitId: null })
    })
  })

  describe('describeItemLocation', () => {
    it('reads place then box', () => {
      const item: InventoryItemSummaryResponse = { id: 1, name: 'Lights', boxId: 10, storageUnitId: 1 }
      expect(describeItemLocation(item, boxes, places)).toBe('Summerhouse · Box 4')
    })

    it('trusts the box over a stale storageUnitId', () => {
      const item: InventoryItemSummaryResponse = { id: 1, name: 'Lights', boxId: 10, storageUnitId: 2 }
      expect(describeItemLocation(item, boxes, places)).toBe('Summerhouse · Box 4')
    })

    it('reads just the place for a loose item', () => {
      const item: InventoryItemSummaryResponse = { id: 1, name: 'Chair', boxId: null, storageUnitId: 2 }
      expect(describeItemLocation(item, boxes, places)).toBe('Basement storage room')
    })

    it('says so when the item is nowhere', () => {
      const item: InventoryItemSummaryResponse = { id: 1, name: 'Tent', boxId: null, storageUnitId: null }
      expect(describeItemLocation(item, boxes, places)).toBe('Not placed yet')
    })
  })

  describe('place hierarchy', () => {
    const home: InventoryStorageUnitResponse = { id: 1, name: 'Home', parentId: null }
    const shedAtHome: InventoryStorageUnitResponse = { id: 2, name: 'Shed', parentId: 1 }
    const summerhouseCabin: InventoryStorageUnitResponse = { id: 3, name: 'Summerhouse', parentId: null }
    const shedAtSummerhouse: InventoryStorageUnitResponse = { id: 4, name: 'Shed', parentId: 3 }
    const nested = [home, shedAtHome, summerhouseCabin, shedAtSummerhouse]

    describe('formatPlaceBreadcrumb', () => {
      it('is just the name for a top-level place', () => {
        expect(formatPlaceBreadcrumb(home, nested)).toBe('Home')
      })

      it('disambiguates two same-named places by their ancestor chain', () => {
        expect(formatPlaceBreadcrumb(shedAtHome, nested)).toBe('Home › Shed')
        expect(formatPlaceBreadcrumb(shedAtSummerhouse, nested)).toBe('Summerhouse › Shed')
      })

      it('does not infinite-loop on a cycle', () => {
        const a: InventoryStorageUnitResponse = { id: 5, name: 'A', parentId: 6 }
        const b: InventoryStorageUnitResponse = { id: 6, name: 'B', parentId: 5 }
        expect(formatPlaceBreadcrumb(a, [a, b])).toBe('B › A')
      })
    })

    describe('topLevelPlaces / childPlaces', () => {
      it('finds only the places without a parent', () => {
        expect(topLevelPlaces(nested)).toEqual([home, summerhouseCabin])
      })

      it('finds the direct children of a place', () => {
        expect(childPlaces(nested, 1)).toEqual([shedAtHome])
        expect(childPlaces(nested, 3)).toEqual([shedAtSummerhouse])
      })
    })

    describe('eligibleParentPlaces', () => {
      it('offers every place when creating a new one', () => {
        expect(eligibleParentPlaces(undefined, nested)).toEqual(nested)
      })

      it('excludes the place itself, so it cannot become its own parent', () => {
        const options = eligibleParentPlaces(home, nested)
        expect(options).not.toContain(home)
      })

      it('excludes descendants, so a place cannot be nested under its own child', () => {
        const options = eligibleParentPlaces(home, nested)
        expect(options).not.toContain(shedAtHome)
        // Unrelated places remain valid parents.
        expect(options).toEqual([summerhouseCabin, shedAtSummerhouse])
      })
    })
  })

  describe('nextBoxNumber', () => {
    it('suggests one past the highest number in use', () => {
      expect(nextBoxNumber(boxes)).toBe(10)
    })

    it('starts at 1 when there are no boxes', () => {
      expect(nextBoxNumber([])).toBe(1)
    })
  })

  describe('describeWarranty', () => {
    const now = new Date('2026-01-01T00:00:00Z')

    it('reports an already-expired warranty', () => {
      const expiresOn = new Date('2025-12-01T00:00:00Z')
      expect(describeWarranty(expiresOn, now)).toEqual({
        status: 'expired',
        label: 'Warranty expired',
      })
    })

    it('reports a warranty expiring today', () => {
      expect(describeWarranty(now, now)).toEqual({
        status: 'expiring-soon',
        label: 'Warranty expires today',
      })
    })

    it('reports a warranty expiring soon in days', () => {
      const expiresOn = new Date('2026-01-06T00:00:00Z')
      expect(describeWarranty(expiresOn, now)).toEqual({
        status: 'expiring-soon',
        label: 'Warranty expires in 5 days',
      })
    })

    it('reports a warranty expiring in months', () => {
      const expiresOn = new Date('2026-04-01T00:00:00Z')
      expect(describeWarranty(expiresOn, now)).toEqual({
        status: 'active',
        label: 'Warranty expires in 3 months',
      })
    })

    it('reports a warranty expiring in years', () => {
      const expiresOn = new Date('2028-01-01T00:00:00Z')
      expect(describeWarranty(expiresOn, now)).toEqual({
        status: 'active',
        label: 'Warranty expires in 2 years',
      })
    })
  })
})
