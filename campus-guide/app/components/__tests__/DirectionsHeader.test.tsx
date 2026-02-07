import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { DirectionsHeader } from '../DirectionsHeader';
import { useDirections } from '../../context/DirectionsContext';
import { useUserLocation } from '../../hooks/useUserLocation';
import { SGW_BUILDINGS } from '../../../constants/buildings';


jest.mock('../../context/DirectionsContext', () => ({
    useDirections: jest.fn(),
}));

jest.mock('../../hooks/useUserLocation', () => ({
    useUserLocation: jest.fn(),
}));

jest.spyOn(Alert, 'alert');

describe('DirectionsHeader', () => {
    const mockSetTransportationMode = jest.fn();
    const mockSwapLocations = jest.fn();
    const mockSetStartBuilding = jest.fn();
    const mockSetDestinationBuilding = jest.fn();
    const mockGetNearestBuilding = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        (useDirections as jest.Mock).mockReturnValue({
            startBuilding: null,
            destinationBuilding: null,
            transportationMode: 'walk',
            setStartBuilding: mockSetStartBuilding,
            setDestinationBuilding: mockSetDestinationBuilding,
            setTransportationMode: mockSetTransportationMode,
            swapLocations: mockSwapLocations,
        });
        (useUserLocation as jest.Mock).mockReturnValue({
            getNearestBuilding: mockGetNearestBuilding,
            isLoading: false,
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

    it('renders the Use Current Location button', () => {
        //Arrange
        const { getByTestId } = render(<DirectionsHeader />);

        //Assert
        expect(getByTestId('use-current-location-button')).toBeTruthy();
    });

    it('sets start building when Use Current Location succeeds', async () => {
        //Arrange
        mockGetNearestBuilding.mockResolvedValue(SGW_BUILDINGS[0]);
        const { getByTestId } = render(<DirectionsHeader />);

        //Act
        fireEvent.press(getByTestId('use-current-location-button'));

        //Assert
        await waitFor(() => {
            expect(mockSetStartBuilding).toHaveBeenCalledWith(SGW_BUILDINGS[0]);
        });
    });

    it('shows alert when Use Current Location fails', async () => {
        //Arrange
        mockGetNearestBuilding.mockResolvedValue(null);
        const { getByTestId } = render(<DirectionsHeader />);

        //Act
        fireEvent.press(getByTestId('use-current-location-button'));

        //Assert
        await waitFor(() => {
            expect(Alert.alert).toHaveBeenCalledWith(
                'Location Error',
                'Could not determine your nearest campus building. Please ensure location permissions are enabled.',
            );
        });
    });

    it('shows loading indicator while fetching location', () => {
        //Arrange
        (useUserLocation as jest.Mock).mockReturnValue({
            getNearestBuilding: mockGetNearestBuilding,
            isLoading: true,
        });

        //Act
        const { getByTestId } = render(<DirectionsHeader />);

        //Assert
        expect(getByTestId('location-loading')).toBeTruthy();
    });
});
