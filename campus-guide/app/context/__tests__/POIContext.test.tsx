import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { POIProvider, usePOIContext } from '../POIContext';
import { POI_INITIAL_SEARCH_CENTER, POI_INITIAL_SEARCH_RADIUS } from '../../../constants/poi';

jest.mock('../../hooks/usePOIs', () => ({
  __esModule: true,
  default: jest.fn(() => ({ pois: [], loading: false, error: null })),
}));

jest.mock('../DirectionsContext', () => ({
  useDirections: jest.fn(() => ({ route: null })),
}));

describe('POIContext', () => {
  const wrapper = ({ children }: { readonly children: React.ReactNode }) => (
    <POIProvider>{children}</POIProvider>
  );

  afterEach(() => {
    jest.useRealTimers();
  });

  it('initializes with default values', () => {
    // Arrange & Act
    const { result } = renderHook(() => usePOIContext(), { wrapper });

    // Assert
    expect(result.current.showPOIs).toBe(false);
    expect(result.current.pois).toEqual([]);
    expect(result.current.isOnCooldown).toBe(false);
    expect(result.current.searchRadius).toBe(POI_INITIAL_SEARCH_RADIUS);
    expect(result.current.searchCenter).toEqual(POI_INITIAL_SEARCH_CENTER);
    expect(result.current.selectedPOI).toBeNull();
  });

  it('setShowPOIs updates visibility', () => {
    // Arrange
    const { result } = renderHook(() => usePOIContext(), { wrapper });

    // Act
    act(() => { result.current.setShowPOIs(true); });

    // Assert
    expect(result.current.showPOIs).toBe(true);
  });

  it('fetchPOIsAt updates searchCenter', () => {
    // Arrange
    const { result } = renderHook(() => usePOIContext(), { wrapper });

    // Act
    act(() => { result.current.fetchPOIsAt(45.458, -73.640); });

    // Assert
    expect(result.current.searchCenter).toEqual({ lat: 45.458, lon: -73.640 });
  });

  it('fetchPOIsAt sets isOnCooldown when called again within 3 seconds', () => {
    // Arrange
    jest.useFakeTimers();
    const { result } = renderHook(() => usePOIContext(), { wrapper });

    // Act — first call succeeds, second is within cooldown
    act(() => { result.current.fetchPOIsAt(45.458, -73.640); });
    act(() => { result.current.fetchPOIsAt(45.460, -73.641); });

    // Assert
    expect(result.current.isOnCooldown).toBe(true);
  });

  it('fetchPOIsAt does not update searchCenter during cooldown', () => {
    // Arrange
    jest.useFakeTimers();
    const { result } = renderHook(() => usePOIContext(), { wrapper });

    // Act
    act(() => { result.current.fetchPOIsAt(45.458, -73.640); });
    act(() => { result.current.fetchPOIsAt(45.460, -73.641); }); // blocked

    // Assert — center stays at first call's value
    expect(result.current.searchCenter).toEqual({ lat: 45.458, lon: -73.640 });
  });

  it('fetchPOIsAt with force=true bypasses cooldown', () => {
    // Arrange
    jest.useFakeTimers();
    const { result } = renderHook(() => usePOIContext(), { wrapper });

    // Act
    act(() => { result.current.fetchPOIsAt(45.458, -73.640); });
    act(() => { result.current.fetchPOIsAt(45.460, -73.641, true); }); // forced

    // Assert
    expect(result.current.isOnCooldown).toBe(false);
    expect(result.current.searchCenter).toEqual({ lat: 45.460, lon: -73.641 });
  });

  it('isOnCooldown clears after cooldown period expires', () => {
    // Arrange
    jest.useFakeTimers();
    const { result } = renderHook(() => usePOIContext(), { wrapper });

    act(() => { result.current.fetchPOIsAt(45.458, -73.640); });
    act(() => { result.current.fetchPOIsAt(45.460, -73.641); }); // triggers cooldown
    expect(result.current.isOnCooldown).toBe(true);

    // Act — advance past cooldown
    act(() => { jest.advanceTimersByTime(3000); });

    // Assert
    expect(result.current.isOnCooldown).toBe(false);
  });

  it('setSearchRadius updates searchRadius', () => {
    // Arrange
    const { result } = renderHook(() => usePOIContext(), { wrapper });

    // Act
    act(() => { result.current.setSearchRadius(2000); });

    // Assert
    expect(result.current.searchRadius).toBe(2000);
  });

  it('setSelectedPOI updates selectedPOI', () => {
    // Arrange
    const { result } = renderHook(() => usePOIContext(), { wrapper });
    const poi = { id: 1, name: 'Test Cafe', type: 'cafe', lat: 45.5, lon: -73.5 };

    // Act
    act(() => { result.current.setSelectedPOI(poi); });

    // Assert
    expect(result.current.selectedPOI).toEqual(poi);
  });

  it('clearPOIs clears selectedPOI', () => {
    // Arrange
    const { result } = renderHook(() => usePOIContext(), { wrapper });
    const poi = { id: 1, name: 'Test Cafe', type: 'cafe', lat: 45.5, lon: -73.5 };
    act(() => { result.current.setSelectedPOI(poi); });

    // Act
    act(() => { result.current.clearPOIs(); });

    // Assert
    expect(result.current.selectedPOI).toBeNull();
  });

  it('throws when used outside POIProvider', () => {
    // Assert
    expect(() => renderHook(() => usePOIContext())).toThrow(
      'usePOIContext must be used within POIProvider'
    );
  });
});
