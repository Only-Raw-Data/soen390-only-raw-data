import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { DirectionsHeader } from '../DirectionsHeader';
import { useDirections } from '../../context/DirectionsContext';
import { SGW_BUILDINGS } from '../../../constants/buildings';

// Mock useDirections
jest.mock('../../context/DirectionsContext', () => ({
    useDirections: jest.fn(),
}));

describe('DirectionsHeader', () => {
    const mockSetTransportationMode = jest.fn();
    const mockSwapLocations = jest.fn();
    const mockSetStartBuilding = jest.fn();
    const mockSetDestinationBuilding = jest.fn();

    beforeEach(() => {
        (useDirections as jest.Mock).mockReturnValue({
            startBuilding: null,
            destinationBuilding: null,
            transportationMode: 'walk',
            setStartBuilding: mockSetStartBuilding,
            setDestinationBuilding: mockSetDestinationBuilding,
            setTransportationMode: mockSetTransportationMode,
            swapLocations: mockSwapLocations,
        });
    });

    it('renders correctly with default values', () => {
        const { getByPlaceholderText, getByTestId } = render(<DirectionsHeader />);

        expect(getByTestId('directions-title')).toBeTruthy();
        expect(getByPlaceholderText('Start location')).toBeTruthy();
        expect(getByPlaceholderText('Destination')).toBeTruthy();
    });

    it('shows selected building names', () => {
        (useDirections as jest.Mock).mockReturnValue({
            startBuilding: SGW_BUILDINGS[0],
            destinationBuilding: SGW_BUILDINGS[1],
            transportationMode: 'walk',
            setStartBuilding: mockSetStartBuilding,
            setDestinationBuilding: mockSetDestinationBuilding,
            setTransportationMode: mockSetTransportationMode,
            swapLocations: mockSwapLocations,
        });

        const { getByDisplayValue } = render(<DirectionsHeader />);

        expect(getByDisplayValue(SGW_BUILDINGS[0].name)).toBeTruthy();
        expect(getByDisplayValue(SGW_BUILDINGS[1].name)).toBeTruthy();
    });

    it('calls setTransportationMode when a mode is tapped', () => {
        const { getByText } = render(<DirectionsHeader />);
        
        fireEvent.press(getByText('Car'));
        expect(mockSetTransportationMode).toHaveBeenCalledWith('car');
    });

    it('calls swapLocations when refresh icon is pressed', () => {
        const { getByTestId } = render(<DirectionsHeader />);
        
        const swapButton = getByTestId('swap-button');
        fireEvent.press(swapButton);
        
        expect(mockSwapLocations).toHaveBeenCalled();
    });

    it('shows search results when typing in start location', () => {
        const { getByTestId, getByText } = render(<DirectionsHeader />);
        
        const input = getByTestId('start-input');
        fireEvent(input, 'focus');
        fireEvent.changeText(input, 'Hall');

        expect(getByText('Henry F. Hall Building')).toBeTruthy();
    });

    it('selects a building from search results', () => {
        const { getByTestId, getByText } = render(<DirectionsHeader />);
        
        const input = getByTestId('start-input');
        fireEvent(input, 'focus');
        fireEvent.changeText(input, 'Hall');
        
        fireEvent.press(getByText('Henry F. Hall Building'));
        
        expect(mockSetStartBuilding).toHaveBeenCalledWith(SGW_BUILDINGS[0]);
    });
});
