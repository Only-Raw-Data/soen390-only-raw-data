import { renderHook, act, waitFor } from '@testing-library/react-native';
import usePOIs from '@hooks/usePOIs';
import { fetchPOIs } from '@services/poiService';

// Mock the POI service
jest.mock('@services/poiService', () => ({
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
    // Arrange
    const { result } = renderHook(() => 
      usePOIs({ lat: 45.5, lon: -73.5, enabled: false })
    );

    // Assert
    expect(result.current.loading).toBe(false);
    expect(result.current.pois).toEqual([]);
    expect(fetchPOIs).not.toHaveBeenCalled();
  });

  it('should not fetch POIs if lat or lon is missing', async () => {
    // Arrange
    const { result } = renderHook(() => 
      usePOIs({ lat: undefined, lon: undefined, enabled: true })
    );

    // Assert
    expect(result.current.loading).toBe(false);
    expect(result.current.pois).toEqual([]);
    expect(fetchPOIs).not.toHaveBeenCalled();
  });

  it('should fetch POIs successfully when enabled with coordinates', async () => {
    // Arrange
    (fetchPOIs as jest.Mock).mockResolvedValueOnce(mockPois);

    const { result } = renderHook(() => 
      usePOIs({ lat: 45.5, lon: -73.5, radius: 1000, limit: 10, enabled: true })
    );

    // Assert
    expect(result.current.loading).toBe(true);
    expect(result.current.pois).toEqual([]);

    await waitFor(() => expect(result.current.loading).toBe(false));

    // Assert
    expect(fetchPOIs).toHaveBeenCalledWith(45.5, -73.5, 1000, 10);
    expect(result.current.loading).toBe(false);
    expect(result.current.pois).toEqual(mockPois);
    expect(result.current.error).toBeNull();
  });

  it('should handle errors from the fetch call', async () => {
    // Arrange
    const mockError = new Error('Network error');
    (fetchPOIs as jest.Mock).mockRejectedValueOnce(mockError);

    // Act
    const { result } = renderHook(() => 
      usePOIs({ lat: 45.5, lon: -73.5, enabled: true })
    );

    // Assert
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.loading).toBe(false);
    expect(result.current.pois).toEqual([]);
    expect(result.current.error).toEqual(mockError);
  });

  it('should clear pois when disabled after a successful fetch', async () => {
    // Arrange
    (fetchPOIs as jest.Mock).mockResolvedValue(mockPois);
    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) =>
        usePOIs({ lat: 45.5, lon: -73.5, enabled }),
      { initialProps: { enabled: true } },
    );
    await waitFor(() => expect(result.current.pois).toEqual(mockPois));

    // Act — disable the hook
    rerender({ enabled: false });

    // Assert — stale pois are cleared
    await waitFor(() => expect(result.current.pois).toEqual([]));
  });

  it('should not update state if unmounted before fetch completes', async () => {
    // Arrange
    // Return a promise that doesn't resolve immediately
    let resolvePromise: any;
    const fetchPromise = new Promise(resolve => {
      resolvePromise = resolve;
    });
    (fetchPOIs as jest.Mock).mockReturnValueOnce(fetchPromise);

    // Act
    const { result, unmount } = renderHook(() => 
      usePOIs({ lat: 45.5, lon: -73.5 }) // test default radius, limit, enabled
    );

    // Unmount before promise resolves
    unmount();
    
    // Now resolve the promise
    await act(async () => {
      resolvePromise(mockPois);
    });
    // Assert
    // POIs should still be empty because it was cancelled
    expect(result.current.pois).toEqual([]);
  });
});
