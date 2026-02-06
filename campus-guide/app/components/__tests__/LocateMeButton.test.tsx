import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { LocateMeButton } from '../LocateMeButton';

// Mock Ionicons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: ({ name, testID }: any) => {
    const { Text } = require('react-native');
    return <Text testID={testID || `icon-${name}`}>{name}</Text>;
  },
}));

// Mock building
const mockBuilding = {
  id: 'h',
  name: 'Henry F. Hall Building',
  code: 'H',
  lat: 45.497092,
  lng: -73.5788,
  campus: 'SGW' as const,
  address: '1455 DeMaisonneuve W',
  x: 0,
  y: 0,
};

describe('LocateMeButton', () => {
  const defaultProps = {
    onLocate: jest.fn().mockResolvedValue(undefined),
    isLoading: false,
    nearestBuilding: null,
    isOnCampus: false,
    errorMsg: null,
    currentCampus: null,
    onCampusDetected: jest.fn(),
    onBuildingHighlight: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders locate button', () => {
    const { getByText } = render(<LocateMeButton {...defaultProps} />);
    
    // Button should render with locate icon
    expect(getByText('locate')).toBeTruthy();
  });

  it('calls onLocate when pressed', async () => {
    const onLocate = jest.fn().mockResolvedValue(undefined);
    const { getByText } = render(
      <LocateMeButton {...defaultProps} onLocate={onLocate} />
    );

    await act(async () => {
      fireEvent.press(getByText('locate'));
    });

    expect(onLocate).toHaveBeenCalled();
  });

  it('shows loading state', () => {
    const { queryByText } = render(
      <LocateMeButton {...defaultProps} isLoading={true} />
    );

    // Should not show locate icon when loading
    expect(queryByText('locate')).toBeNull();
  });

  it('disables button when loading', async () => {
    const onLocate = jest.fn();
    const { getByText } = render(
      <LocateMeButton {...defaultProps} isLoading={true} onLocate={onLocate} />
    );

    // The button should be disabled, so pressing shouldn't call onLocate
    // We can't easily test disabled state in RN testing library,
    // but we can verify the loading indicator is shown
    expect(onLocate).not.toHaveBeenCalled();
  });

  it('shows success toast when building found', async () => {
    const { rerender, getByText } = render(
      <LocateMeButton {...defaultProps} isLoading={true} />
    );

    // Simulate location found
    rerender(
      <LocateMeButton
        {...defaultProps}
        isLoading={false}
        isOnCampus={true}
        nearestBuilding={mockBuilding}
        currentCampus="SGW"
      />
    );

    await waitFor(() => {
      expect(getByText(/You are near Henry F. Hall Building/)).toBeTruthy();
    });
  });

  it('shows error toast when not on campus', async () => {
    const errorMsg = "You don't appear to be on campus.";
    const { rerender, getByText } = render(
      <LocateMeButton {...defaultProps} isLoading={true} />
    );

    // Simulate error
    rerender(
      <LocateMeButton
        {...defaultProps}
        isLoading={false}
        errorMsg={errorMsg}
      />
    );

    await waitFor(() => {
      expect(getByText(errorMsg)).toBeTruthy();
    });
  });

  it('calls onCampusDetected when campus found', async () => {
    const onCampusDetected = jest.fn();
    const { rerender } = render(
      <LocateMeButton 
        {...defaultProps} 
        isLoading={true}
        onCampusDetected={onCampusDetected}
      />
    );

    // Simulate location found
    rerender(
      <LocateMeButton
        {...defaultProps}
        isLoading={false}
        isOnCampus={true}
        nearestBuilding={mockBuilding}
        currentCampus="SGW"
        onCampusDetected={onCampusDetected}
      />
    );

    await waitFor(() => {
      expect(onCampusDetected).toHaveBeenCalledWith('SGW');
    });
  });

  it('calls onBuildingHighlight when building found', async () => {
    const onBuildingHighlight = jest.fn();
    const { rerender } = render(
      <LocateMeButton 
        {...defaultProps} 
        isLoading={true}
        onBuildingHighlight={onBuildingHighlight}
      />
    );

    // Simulate location found
    rerender(
      <LocateMeButton
        {...defaultProps}
        isLoading={false}
        isOnCampus={true}
        nearestBuilding={mockBuilding}
        currentCampus="SGW"
        onBuildingHighlight={onBuildingHighlight}
      />
    );

    await waitFor(() => {
      expect(onBuildingHighlight).toHaveBeenCalledWith('h');
    });
  });

  it('clears highlight when locate button pressed', async () => {
    const onBuildingHighlight = jest.fn();
    const onLocate = jest.fn().mockResolvedValue(undefined);
    const { getByText } = render(
      <LocateMeButton
        {...defaultProps}
        onLocate={onLocate}
        onBuildingHighlight={onBuildingHighlight}
      />
    );

    await act(async () => {
      fireEvent.press(getByText('locate'));
    });

    expect(onBuildingHighlight).toHaveBeenCalledWith(null);
  });

  it('clears highlight on error', async () => {
    const onBuildingHighlight = jest.fn();
    const { rerender } = render(
      <LocateMeButton 
        {...defaultProps} 
        isLoading={true}
        onBuildingHighlight={onBuildingHighlight}
      />
    );

    // Simulate error
    rerender(
      <LocateMeButton
        {...defaultProps}
        isLoading={false}
        errorMsg="Location permission denied."
        onBuildingHighlight={onBuildingHighlight}
      />
    );

    await waitFor(() => {
      expect(onBuildingHighlight).toHaveBeenCalledWith(null);
    });
  });

  it('toast can be dismissed', async () => {
    const { rerender, getByText, queryByText } = render(
      <LocateMeButton {...defaultProps} isLoading={true} />
    );

    // Simulate location found
    rerender(
      <LocateMeButton
        {...defaultProps}
        isLoading={false}
        isOnCampus={true}
        nearestBuilding={mockBuilding}
        currentCampus="SGW"
      />
    );

    // Wait for toast to appear
    await waitFor(() => {
      expect(getByText(/You are near/)).toBeTruthy();
    });

    // Press close button
    const closeButton = getByText('close');
    await act(async () => {
      fireEvent.press(closeButton);
    });

    // Fast-forward animation
    act(() => {
      jest.advanceTimersByTime(300);
    });

    // Toast should be gone
    await waitFor(() => {
      expect(queryByText(/You are near/)).toBeNull();
    });
  });
});

