import { renderHook, act } from '@testing-library/react-native';
import * as Location from 'expo-location';
import { useCurrentLocation, findNearestBuilding } from '../useCurrentLocation';
import { SGW_BUILDINGS, LOYOLA_BUILDINGS } from '../../../constants/buildings';

jest.mock('expo-location', () => ({
    requestForegroundPermissionsAsync: jest.fn(),
    getCurrentPositionAsync: jest.fn(),
}));

describe('findNearestBuilding', () => {
    it('returns the nearest building to the given coordinates', () => {
        const target = SGW_BUILDINGS[0];
        const result = findNearestBuilding(target.lat, target.lng);
        expect(result).not.toBeNull();
        expect(result!.id).toBe(target.id);
    });

    it('returns null for an empty buildings list', () => {
        const result = findNearestBuilding(45.495, -73.578, []);
        expect(result).toBeNull();
    });

    it('returns the closest building when between two campuses', () => {
        const result = findNearestBuilding(45.497, -73.579);
        expect(result).not.toBeNull();
        expect(result!.campus).toBe('SGW');
    });
});

describe('useCurrentLocation', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns nearest building when permission is granted', async () => {
        (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
            status: 'granted',
        });
        (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
            coords: { latitude: SGW_BUILDINGS[0].lat, longitude: SGW_BUILDINGS[0].lng },
        });

        const { result } = renderHook(() => useCurrentLocation());

        let building: any;
        await act(async () => {
            building = await result.current.getNearestBuilding();
        });

        expect(building).not.toBeNull();
        expect(building.id).toBe(SGW_BUILDINGS[0].id);
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeNull();
    });

    it('returns null and sets error when permission is denied', async () => {
        (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
            status: 'denied',
        });

        const { result } = renderHook(() => useCurrentLocation());

        let building: any;
        await act(async () => {
            building = await result.current.getNearestBuilding();
        });

        expect(building).toBeNull();
        expect(result.current.error).toBe('Location permission denied');
        expect(result.current.loading).toBe(false);
    });

    it('returns null and sets error when location fetch fails', async () => {
        (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
            status: 'granted',
        });
        (Location.getCurrentPositionAsync as jest.Mock).mockRejectedValue(
            new Error('Location unavailable'),
        );

        const { result } = renderHook(() => useCurrentLocation());

        let building: any;
        await act(async () => {
            building = await result.current.getNearestBuilding();
        });

        expect(building).toBeNull();
        expect(result.current.error).toBe('Failed to get current location');
        expect(result.current.loading).toBe(false);
    });
});
