import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { DirectionsHeader } from '../DirectionsHeader';
import { useDirections } from '../../context/DirectionsContext';
import { SGW_BUILDINGS } from '../../../constants/buildings';


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
        //Arrange
        const { getByPlaceholderText, getByTestId } = render(<DirectionsHeader />);

        //Assert
        expect(getByTestId('directions-title')).toBeTruthy();
        expect(getByPlaceholderText('Start location')).toBeTruthy();
        expect(getByPlaceholderText('Destination')).toBeTruthy();
    });

    it('shows selected building names', () => {
        //Arrange
        (useDirections as jest.Mock).mockReturnValue({
            startBuilding: SGW_BUILDINGS[0],
            destinationBuilding: SGW_BUILDINGS[1],
            transportationMode: 'walk',
            setStartBuilding: mockSetStartBuilding,
            setDestinationBuilding: mockSetDestinationBuilding,
            setTransportationMode: mockSetTransportationMode,
            swapLocations: mockSwapLocations,
        });

        //Act
        const { getByDisplayValue } = render(<DirectionsHeader />);

        //Assert
        expect(getByDisplayValue(SGW_BUILDINGS[0].name)).toBeTruthy();
        expect(getByDisplayValue(SGW_BUILDINGS[1].name)).toBeTruthy();
    });

    it('calls setTransportationMode when a mode is tapped', () => {
        //Arrange
        const { getByText } = render(<DirectionsHeader />);

        //Act
        fireEvent.press(getByText('Car'));

        //Assert
        expect(mockSetTransportationMode).toHaveBeenCalledWith('car');
    });

    it('calls swapLocations when refresh icon is pressed', () => {
        //Arrange
        const { getByTestId } = render(<DirectionsHeader />);
        const swapButton = getByTestId('swap-button');

        //Act
        fireEvent.press(swapButton);

        //Assert
        expect(mockSwapLocations).toHaveBeenCalled();
    });

    it('shows search results when typing in start location', () => {
        //Arrange
        const { getByTestId, getByText } = render(<DirectionsHeader />);
        const input = getByTestId('start-input');

        //Act
        fireEvent(input, 'focus');
        fireEvent.changeText(input, 'Hall');

        //Assert
        expect(getByText('Henry F. Hall Building')).toBeTruthy();
    });

    it('opens schedule modal when shuttle mode is selected', () => {
        //Arrange
        (useDirections as jest.Mock).mockReturnValue({
            startBuilding: null,
            destinationBuilding: null,
            transportationMode: 'shuttle',
            setStartBuilding: mockSetStartBuilding,
            setDestinationBuilding: mockSetDestinationBuilding,
            setTransportationMode: mockSetTransportationMode,
            swapLocations: mockSwapLocations,
        });

        //Act
        const { getAllByText } = render(<DirectionsHeader />);

        //Assert - Modal should show schedule (may appear multiple times due to modal structure)
        const scheduleTexts = getAllByText('Shuttle Bus Schedule');
        expect(scheduleTexts.length).toBeGreaterThan(0);
    });

    it('displays schedule component in modal when shuttle mode is selected', () => {
        //Arrange
        (useDirections as jest.Mock).mockReturnValue({
            startBuilding: null,
            destinationBuilding: null,
            transportationMode: 'shuttle',
            setStartBuilding: mockSetStartBuilding,
            setDestinationBuilding: mockSetDestinationBuilding,
            setTransportationMode: mockSetTransportationMode,
            swapLocations: mockSwapLocations,
        });

        //Act
        const { getAllByText } = render(<DirectionsHeader />);

        //Assert - Modal should show schedule with day selector
        expect(getAllByText('Shuttle Bus Schedule').length).toBeGreaterThan(0);
        expect(getAllByText('Monday — Thursday').length).toBeGreaterThan(0);
        expect(getAllByText('Friday').length).toBeGreaterThan(0);
    });

    it('shows Get Directions button even when shuttle mode is selected', () => {
        //Arrange
        (useDirections as jest.Mock).mockReturnValue({
            startBuilding: null,
            destinationBuilding: null,
            transportationMode: 'shuttle',
            setStartBuilding: mockSetStartBuilding,
            setDestinationBuilding: mockSetDestinationBuilding,
            setTransportationMode: mockSetTransportationMode,
            swapLocations: mockSwapLocations,
        });

        //Act
        const { getAllByText } = render(<DirectionsHeader />);

        //Assert - Button should be visible (may appear multiple times)
        expect(getAllByText('Get Directions').length).toBeGreaterThan(0);
    });
});
