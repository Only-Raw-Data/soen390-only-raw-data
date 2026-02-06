import { renderHook, act, waitFor } from '@testing-library/react-native';
import * as Location from 'expo-location';
import { useUserLocation } from '../useUserLocation';

// Mock expo-location
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  watchPositionAsync: jest.fn(),
  Accuracy: {
    High: 5,
  },
  PermissionStatus: {
    GRANTED: 'granted',
    DENIED: 'denied',
    UNDETERMINED: 'undetermined',
  },
}));

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
      address: '1455 DeMaisonneuve W',
      x: 0,
      y: 0,
    },
    {
      id: 'mb',
      name: 'John Molson Building',
      code: 'MB',
      lat: 45.495304,
      lng: -73.579044,
      campus: 'SGW',
      address: '1450 Guy Street',
      x: 0,
      y: 0,
    },
    {
      id: 'cc',
      name: 'Central Building',
      code: 'CC',
      lat: 45.458204,
      lng: -73.6403,
      campus: 'Loyola',
      address: '7141 Sherbrooke West',
      x: 0,
      y: 0,
    },
  ],
  SGW_BUILDINGS: [],
  LOYOLA_BUILDINGS: [],
}));

describe('useUserLocation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes with default state', () => {
    const { result } = renderHook(() => useUserLocation());

    expect(result.current.location).toBeNull();
    expect(result.current.errorMsg).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.nearestBuilding).toBeNull();
    expect(result.current.isOnCampus).toBe(false);
    expect(result.current.currentCampus).toBeNull();
  });

  it('handles permission denied', async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'denied',
    });

    const { result } = renderHook(() => useUserLocation());

    await act(async () => {
      await result.current.getCurrentLocation();
    });

    expect(result.current.errorMsg).toContain('Location permission denied');
    expect(result.current.isLoading).toBe(false);
  });

  it('gets current location when permission granted', async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });

    const mockLocation = {
      coords: {
        latitude: 45.497092,
        longitude: -73.5788,
        altitude: null,
        accuracy: 10,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    };

    (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue(mockLocation);

    const { result } = renderHook(() => useUserLocation());

    await act(async () => {
      await result.current.getCurrentLocation();
    });

    expect(result.current.location).toEqual(mockLocation);
    expect(result.current.isLoading).toBe(false);
  });

  it('identifies nearest building when on campus', async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });

    // Location very close to H building
    const mockLocation = {
      coords: {
        latitude: 45.497092,
        longitude: -73.5788,
        altitude: null,
        accuracy: 10,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    };

    (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue(mockLocation);

    const { result } = renderHook(() => useUserLocation());

    await act(async () => {
      await result.current.getCurrentLocation();
    });

    expect(result.current.isOnCampus).toBe(true);
    expect(result.current.nearestBuilding?.id).toBe('h');
    expect(result.current.currentCampus).toBe('SGW');
  });

  it('shows not on campus when far from buildings', async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });

    // Location far from any campus (downtown Montreal)
    const mockLocation = {
      coords: {
        latitude: 45.5017,
        longitude: -73.5673,
        altitude: null,
        accuracy: 10,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    };

    (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue(mockLocation);

    const { result } = renderHook(() => useUserLocation());

    await act(async () => {
      await result.current.getCurrentLocation();
    });

    expect(result.current.isOnCampus).toBe(false);
    expect(result.current.nearestBuilding).toBeNull();
    expect(result.current.errorMsg).toContain("don't appear to be on campus");
  });

  it('handles location tracking subscription', async () => {
    const mockRemove = jest.fn();
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });

    (Location.watchPositionAsync as jest.Mock).mockResolvedValue({
      remove: mockRemove,
    });

    const { result, unmount } = renderHook(() => useUserLocation());

    await act(async () => {
      await result.current.startLocationTracking();
    });

    expect(Location.watchPositionAsync).toHaveBeenCalled();

    // Cleanup on unmount
    unmount();
    expect(mockRemove).toHaveBeenCalled();
  });

  it('stops location tracking when requested', async () => {
    const mockRemove = jest.fn();
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });

    (Location.watchPositionAsync as jest.Mock).mockResolvedValue({
      remove: mockRemove,
    });

    const { result } = renderHook(() => useUserLocation());

    await act(async () => {
      await result.current.startLocationTracking();
    });

    act(() => {
      result.current.stopLocationTracking();
    });

    expect(mockRemove).toHaveBeenCalled();
  });

  it('handles location error gracefully', async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });

    (Location.getCurrentPositionAsync as jest.Mock).mockRejectedValue(
      new Error('Location unavailable')
    );

    const { result } = renderHook(() => useUserLocation());

    await act(async () => {
      await result.current.getCurrentLocation();
    });

    expect(result.current.errorMsg).toContain('Failed to get your location');
    expect(result.current.isLoading).toBe(false);
  });

  it('identifies Loyola campus correctly', async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });

    // Location near CC building at Loyola
    const mockLocation = {
      coords: {
        latitude: 45.458204,
        longitude: -73.6403,
        altitude: null,
        accuracy: 10,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    };

    (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue(mockLocation);

    const { result } = renderHook(() => useUserLocation());

    await act(async () => {
      await result.current.getCurrentLocation();
    });

    expect(result.current.isOnCampus).toBe(true);
    expect(result.current.nearestBuilding?.id).toBe('cc');
    expect(result.current.currentCampus).toBe('Loyola');
  });
});

