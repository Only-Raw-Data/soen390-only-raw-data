import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { DirectionsProvider, useDirections } from '../DirectionsContext';
import { SGW_BUILDINGS } from '../../../constants/buildings';

describe('DirectionsContext', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
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
});
