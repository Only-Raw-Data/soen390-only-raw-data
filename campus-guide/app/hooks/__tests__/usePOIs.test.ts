import { renderHook, act, waitFor } from '@testing-library/react-native';
import usePOIs from '../usePOIs';
import { fetchPOIs } from '../../services/poiService';

// Mock the POI service
jest.mock('../../services/poiService', () => ({
  fetchPOIs: jest.fn()
}));

describe('usePOIs', () => {
  const mockPois = [
    { id: 1, name: 'Test Cafe', type: 'cafe', lat: 45.4975, lon: -73.5780, distance: 100 },
    { id: 2, name: 'Test Restaurant', type: 'restaurant', lat: 45.4980, lon: -73.5775, distance: 200 }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not fetch POIs if enabled is false', async () => {
    const { result } = renderHook(() => 
      usePOIs({ lat: 45.5, lon: -73.5, enabled: false })
    );

    expect(result.current.loading).toBe(false);
    expect(result.current.pois).toEqual([]);
    expect(fetchPOIs).not.toHaveBeenCalled();
  });

  it('should not fetch POIs if lat or lon is missing', async () => {
    const { result } = renderHook(() => 
      usePOIs({ lat: undefined, lon: undefined, enabled: true })
    );

    expect(result.current.loading).toBe(false);
    expect(result.current.pois).toEqual([]);
    expect(fetchPOIs).not.toHaveBeenCalled();
  });

  it('should fetch POIs successfully when enabled with coordinates', async () => {
    (fetchPOIs as jest.Mock).mockResolvedValueOnce(mockPois);

    const { result } = renderHook(() => 
      usePOIs({ lat: 45.5, lon: -73.5, radius: 1000, limit: 10, enabled: true })
    );

    expect(result.current.loading).toBe(true);
    expect(result.current.pois).toEqual([]);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(fetchPOIs).toHaveBeenCalledWith(45.5, -73.5, 1000, 10);
    expect(result.current.loading).toBe(false);
    expect(result.current.pois).toEqual(mockPois);
    expect(result.current.error).toBeNull();
  });

  it('should handle errors from the fetch call', async () => {
    const mockError = new Error('Network error');
    (fetchPOIs as jest.Mock).mockRejectedValueOnce(mockError);

    const { result } = renderHook(() => 
      usePOIs({ lat: 45.5, lon: -73.5, enabled: true })
    );

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.loading).toBe(false);
    expect(result.current.pois).toEqual([]);
    expect(result.current.error).toEqual(mockError);
  });
});
