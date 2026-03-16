import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import DirectionsProvider, { useDirections } from '../DirectionsContext';
import { SGW_BUILDINGS } from '@/constants/buildings';
import { fetchDirections } from '@app/services/directionsService';

jest.mock('@app/services/directionsService', () => ({
    fetchDirections: jest.fn(),
}));

describe('DirectionsContext', () => {
    const wrapper = ({ children }: { readonly children: React.ReactNode }) => (
        <DirectionsProvider>{children}</DirectionsProvider>
    );

    it('should initialize with default values', () => {
        // Arrange
        const { result } = renderHook(() => useDirections(), { wrapper });

        // Assert
        expect(result.current.startBuilding).toBeNull();
        expect(result.current.destinationBuilding).toBeNull();
        expect(result.current.transportationMode).toBe('walk');
    });

    it('should set start building', () => {
        // Arrange
        const { result } = renderHook(() => useDirections(), { wrapper });
        const building = SGW_BUILDINGS[0];

        // Act
        act(() => {
            result.current.setStartBuilding(building);
        });

        // Assert
        expect(result.current.startBuilding).toEqual(building);
    });

    it('should set destination building', () => {
        // Arrange
        const { result } = renderHook(() => useDirections(), { wrapper });
        const building = SGW_BUILDINGS[1];

        // Act
        act(() => {
            result.current.setDestinationBuilding(building);
        });

        // Assert
        expect(result.current.destinationBuilding).toEqual(building);
    });

    it('should set transportation mode', () => {
        // Arrange
        const { result } = renderHook(() => useDirections(), { wrapper });

        // Act
        act(() => {
            result.current.setTransportationMode('car');
        });

        // Assert

        expect(result.current.transportationMode).toBe('car');
    });

    it('should swap locations', () => {
        // Arrange
        const { result } = renderHook(() => useDirections(), { wrapper });
        const start = SGW_BUILDINGS[0];
        const dest = SGW_BUILDINGS[1];

        // Act
        act(() => {
            result.current.setStartBuilding(start);
            result.current.setDestinationBuilding(dest);
        });

        act(() => {
            result.current.swapLocations();
        });

        // Assert
        expect(result.current.startBuilding).toEqual(dest);
        expect(result.current.destinationBuilding).toEqual(start);
    });

    it('should clear directions', () => {
        // Arrange
        const { result } = renderHook(() => useDirections(), { wrapper });

        // Act
        act(() => {
            result.current.setStartBuilding(SGW_BUILDINGS[0]);
            result.current.setTransportationMode('transit');
        });

        act(() => {
            result.current.clearDirections();
        });

        // Assert
        expect(result.current.startBuilding).toBeNull();
        expect(result.current.transportationMode).toBe('walk');
    });

    it('should not fetch route if start or destination is missing', async () => {
        const { result } = renderHook(() => useDirections(), { wrapper });

        await act(async () => {
            await result.current.fetchRoute();
        });

        expect(fetchDirections).not.toHaveBeenCalled();
    });

    it('should fetch route successfully', async () => {
        const mockRoute = { distance: 100, duration: 200 } as any;
        (fetchDirections as jest.Mock).mockResolvedValueOnce(mockRoute);

        const { result } = renderHook(() => useDirections(), { wrapper });

        act(() => {
            result.current.setStartBuilding(SGW_BUILDINGS[0]);
            result.current.setDestinationBuilding(SGW_BUILDINGS[1]);
        });

        await act(async () => {
            await result.current.fetchRoute();
        });

        expect(fetchDirections).toHaveBeenCalled();
        expect(result.current.route).toEqual(mockRoute);
        expect(result.current.isLoadingRoute).toBe(false);
    });

    it('should ignore stale route responses (race condition protection)', async () => {
        // Arrange
        const mockRoute1 = { distance: '1 km', duration: '5 mins', coordinates: [] } as any;
        const mockRoute2 = { distance: '2 km', duration: '10 mins', coordinates: [] } as any;
        
        // Mock fetchDirections to return different routes with different delays
        let resolveFirst: (val: any) => void;
        const firstFetch = new Promise((resolve) => { resolveFirst = resolve; });
        (fetchDirections as jest.Mock)
            .mockReturnValueOnce(firstFetch)
            .mockResolvedValueOnce(mockRoute2);

        const { result } = renderHook(() => useDirections(), { wrapper });

        // Act
        act(() => {
            result.current.setStartBuilding(SGW_BUILDINGS[0]);
            result.current.setDestinationBuilding(SGW_BUILDINGS[1]);
        });

        // Trigger first fetch
        let fetchPromise1: Promise<void>;
        act(() => {
            fetchPromise1 = result.current.fetchRoute();
        });

        // Trigger second fetch immediately (it will resolve instantly because of mockResolvedValueOnce)
        await act(async () => {
            await result.current.fetchRoute();
        });

        // Assert: Second route should be set
        expect(result.current.route).toEqual(mockRoute2);

        // Act: Now resolve the first fetch
        await act(async () => {
            resolveFirst(mockRoute1);
            await fetchPromise1;
        });

        // Assert: Route should STILL be mockRoute2 (first one was ignored as stale)
        expect(result.current.route).toEqual(mockRoute2);
    });

    it('should invalidate pending requests when clearDirections is called', async () => {
        // Arrange
        const mockRoute = { distance: '1 km', duration: '5 mins', coordinates: [] } as any;
        let resolveFetch: (val: any) => void;
        const fetchPromise = new Promise((resolve) => { resolveFetch = resolve; });
        (fetchDirections as jest.Mock).mockReturnValueOnce(fetchPromise);

        const { result } = renderHook(() => useDirections(), { wrapper });

        // Act
        act(() => {
            result.current.setStartBuilding(SGW_BUILDINGS[0]);
            result.current.setDestinationBuilding(SGW_BUILDINGS[1]);
        });

        let routeCall: Promise<void>;
        act(() => {
            routeCall = result.current.fetchRoute();
        });

        act(() => {
            result.current.clearDirections();
        });

        // Resolve the fetch after clearing
        await act(async () => {
            resolveFetch(mockRoute);
            await routeCall;
        });

        // Assert
        expect(result.current.route).toBeNull();
        expect(result.current.startBuilding).toBeNull();
    });

    it('should handle fetchRoute errors gracefully', async () => {
        // Arrange
        (fetchDirections as jest.Mock).mockRejectedValueOnce(new Error('API Error'));
        const { result } = renderHook(() => useDirections(), { wrapper });

        act(() => {
            result.current.setStartBuilding(SGW_BUILDINGS[0]);
            result.current.setDestinationBuilding(SGW_BUILDINGS[1]);
        });

        // Act
        await act(async () => {
            await result.current.fetchRoute();
        });

        // Assert
        expect(result.current.route).toBeNull();
        expect(result.current.isLoadingRoute).toBe(false);
    });
});
