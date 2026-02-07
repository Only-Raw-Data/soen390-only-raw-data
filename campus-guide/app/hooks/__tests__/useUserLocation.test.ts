import { renderHook, act, waitFor } from '@testing-library/react-native';
import * as Location from 'expo-location';
import { useUserLocation, findNearestBuilding } from '../useUserLocation';

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

// Helper to create mock location objects
const createMockLocation = (latitude: number, longitude: number): Location.LocationObject => ({
  coords: {
    latitude,
    longitude,
    altitude: null,
    accuracy: 10,
    altitudeAccuracy: null,
    heading: null,
    speed: null,
  },
  timestamp: Date.now(),
});

// Test coordinates
const COORDS = {
  H_BUILDING: { lat: 45.497092, lng: -73.5788 },
  CC_BUILDING: { lat: 45.458204, lng: -73.6403 },
  OFF_CAMPUS: { lat: 45.5017, lng: -73.5673 },
};

// Helper to setup permission mock
const mockPermission = (status: 'granted' | 'denied') => {
  (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status });
};

describe('findNearestBuilding', () => {
  it('returns the nearest building to given coordinates', () => {
    const result = findNearestBuilding(45.497092, -73.5788);
    expect(result).not.toBeNull();
    expect(result!.id).toBe('h');
  });

  it('returns null for an empty buildings list', () => {
    const result = findNearestBuilding(45.495, -73.578, []);
    expect(result).toBeNull();
  });

  it('returns the closest building among candidates', () => {
    const result = findNearestBuilding(45.497, -73.579);
    expect(result).not.toBeNull();
    expect(result!.id).toBe('h');
  });
});

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
    mockPermission('denied');

    const { result } = renderHook(() => useUserLocation());

    await act(async () => {
      await result.current.getCurrentLocation();
    });

    expect(result.current.errorMsg).toContain('Location permission denied');
    expect(result.current.isLoading).toBe(false);
  });

  it('gets current location when permission granted', async () => {
    mockPermission('granted');
    const mockLocation = createMockLocation(COORDS.H_BUILDING.lat, COORDS.H_BUILDING.lng);
    (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue(mockLocation);

    const { result } = renderHook(() => useUserLocation());

    await act(async () => {
      await result.current.getCurrentLocation();
    });

    expect(result.current.location?.coords.latitude).toBe(COORDS.H_BUILDING.lat);
    expect(result.current.location?.coords.longitude).toBe(COORDS.H_BUILDING.lng);
    expect(result.current.isLoading).toBe(false);
  });

  it('identifies nearest building when on campus', async () => {
    mockPermission('granted');
    (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue(
      createMockLocation(COORDS.H_BUILDING.lat, COORDS.H_BUILDING.lng)
    );

    const { result } = renderHook(() => useUserLocation());

    await act(async () => {
      await result.current.getCurrentLocation();
    });

    expect(result.current.isOnCampus).toBe(true);
    expect(result.current.nearestBuilding?.id).toBe('h');
    expect(result.current.currentCampus).toBe('SGW');
  });

  it('shows not on campus when far from buildings', async () => {
    mockPermission('granted');
    (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue(
      createMockLocation(COORDS.OFF_CAMPUS.lat, COORDS.OFF_CAMPUS.lng)
    );

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
    mockPermission('granted');
    (Location.watchPositionAsync as jest.Mock).mockResolvedValue({ remove: mockRemove });

    const { result, unmount } = renderHook(() => useUserLocation());

    await act(async () => {
      await result.current.startLocationTracking();
    });

    expect(Location.watchPositionAsync).toHaveBeenCalled();

    unmount();
    expect(mockRemove).toHaveBeenCalled();
  });

  it('stops location tracking when requested', async () => {
    const mockRemove = jest.fn();
    mockPermission('granted');
    (Location.watchPositionAsync as jest.Mock).mockResolvedValue({ remove: mockRemove });

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
    mockPermission('granted');
    (Location.getCurrentPositionAsync as jest.Mock).mockRejectedValue(new Error('Location unavailable'));

    const { result } = renderHook(() => useUserLocation());

    await act(async () => {
      await result.current.getCurrentLocation();
    });

    expect(result.current.errorMsg).toContain('Failed to get your location');
    expect(result.current.isLoading).toBe(false);
  });

  it('identifies Loyola campus correctly', async () => {
    mockPermission('granted');
    (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue(
      createMockLocation(COORDS.CC_BUILDING.lat, COORDS.CC_BUILDING.lng)
    );

    const { result } = renderHook(() => useUserLocation());

    await act(async () => {
      await result.current.getCurrentLocation();
    });

    expect(result.current.isOnCampus).toBe(true);
    expect(result.current.nearestBuilding?.id).toBe('cc');
    expect(result.current.currentCampus).toBe('Loyola');
  });
});
