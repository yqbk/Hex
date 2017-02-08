import { getNeighbours } from '../utils/generator'

describe('getNeighbours', () => {
  const testGetNeighbours = (id, width, height, expectedArray) => {
    const result = getNeighbours(id, width, height)
    expect(JSON.stringify(result)).toBe(JSON.stringify(expectedArray))
  }

  test('returns correct neighbours', () => {
    testGetNeighbours(0, 15, 15, [1, 15])
    testGetNeighbours(209, 15, 15, [208, 194, 224])
    testGetNeighbours(79, 15, 15, [78, 64, 65, 80, 95, 94])
    testGetNeighbours(60, 15, 15, [45, 61, 75])
  })
})
