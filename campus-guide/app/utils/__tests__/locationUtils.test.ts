import { calculateDistance, findNearestBuilding } from '../locationUtils';

// Mock building constants
jest.mock('../../../constants/buildings', () => ({
  All_BUILDINGS: [
    {
      id: 'h',
      name: 'Henry F. Hall Building',
      code: 'H',
      lat: 45.497092,
      lng: -73.5788,
      campus: 'SGW',
    },
    {
      id: 'cc',
      name: 'Central Building',
      code: 'CC',
      lat: 45.458204,
      lng: -73.6403,
      campus: 'Loyola',
    },
  ],
}));

describe('locationUtils', () => {
  describe('calculateDistance', () => {
    it('returns 0 for same coordinates', () => {
      const distance = calculateDistance(45.497092, -73.5788, 45.497092, -73.5788);
      expect(distance).toBe(0);
    });

    it('calculates distance between two points correctly', () => {
      const distance = calculateDistance(45.497092, -73.5788, 45.458204, -73.6403);
      expect(distance).toBeGreaterThan(6000);
      expect(distance).toBeLessThan(7000);
    });

    it('returns same distance regardless of direction', () => {
      const distance1 = calculateDistance(45.497092, -73.5788, 45.458204, -73.6403);
      const distance2 = calculateDistance(45.458204, -73.6403, 45.497092, -73.5788);
      expect(distance1).toBeCloseTo(distance2, 5);
    });
  });

  describe('findNearestBuilding', () => {
    it('finds H Building when at SGW campus', () => {
      const result = findNearestBuilding(45.497092, -73.5788);
      expect(result.building?.id).toBe('h');
      expect(result.campus).toBe('SGW');
      expect(result.distance).toBe(0);
    });

    it('finds CC Building when at Loyola campus', () => {
      const result = findNearestBuilding(45.458204, -73.6403);
      expect(result.building?.id).toBe('cc');
      expect(result.campus).toBe('Loyola');
      expect(result.distance).toBe(0);
    });

    it('finds nearest building when between campuses', () => {
      const result = findNearestBuilding(45.49, -73.58);
      expect(result.building).not.toBeNull();
      expect(result.distance).toBeGreaterThan(0);
    });

    it('returns distance in meters', () => {
      const result = findNearestBuilding(45.498, -73.5788);
      expect(result.distance).toBeGreaterThan(50);
      expect(result.distance).toBeLessThan(200);
    });
  });
});

