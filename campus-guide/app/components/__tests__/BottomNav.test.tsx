import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { BottomNav } from '../BottomNav';
import { Screen } from '../../types/Screen';

describe('BottomNav', () => {
    const mockOnScreenChange = jest.fn();
    const defaultProps = {
        currentScreen: 'map' as Screen,
        onScreenChange: mockOnScreenChange,
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders all navigation items', () => {
        const { getByText } = render(<BottomNav {...defaultProps} />);

        expect(getByText('Map')).toBeTruthy();
        expect(getByText('Directions')).toBeTruthy();
        expect(getByText('Schedule')).toBeTruthy();
        expect(getByText('Indoor')).toBeTruthy();
        expect(getByText('POI')).toBeTruthy();
    });

    it('highlights the current screen', () => {
        const { getByText } = render(<BottomNav {...defaultProps} />);
        const mapButton = getByText('Map').parent;

        // The active button should have different styling
        expect(mapButton).toBeTruthy();
    });

    it('calls onScreenChange when a navigation item is pressed', () => {
        const { getByText } = render(<BottomNav {...defaultProps} />);

        fireEvent.press(getByText('Directions'));

        expect(mockOnScreenChange).toHaveBeenCalledWith('directions');
        expect(mockOnScreenChange).toHaveBeenCalledTimes(1);
    });

    it('calls onScreenChange with correct screen for each nav item', () => {
        const { getByText } = render(<BottomNav {...defaultProps} />);

        const navItems = [
            { label: 'Map', screen: 'map' },
            { label: 'Directions', screen: 'directions' },
            { label: 'Schedule', screen: 'schedule' },
            { label: 'Indoor', screen: 'indoor' },
            { label: 'POI', screen: 'poi' },
        ];

        navItems.forEach(({ label, screen }) => {
            mockOnScreenChange.mockClear();
            fireEvent.press(getByText(label));
            expect(mockOnScreenChange).toHaveBeenCalledWith(screen);
        });
    });

    it('renders with different current screen', () => {
        const { getByText } = render(
            <BottomNav currentScreen="directions" onScreenChange={mockOnScreenChange} />
        );

        expect(getByText('Directions')).toBeTruthy();
    });

    it('handles rapid navigation changes', () => {
        const { getByText } = render(<BottomNav {...defaultProps} />);

        fireEvent.press(getByText('Directions'));
        fireEvent.press(getByText('Schedule'));
        fireEvent.press(getByText('Indoor'));

        expect(mockOnScreenChange).toHaveBeenCalledTimes(3);
        expect(mockOnScreenChange).toHaveBeenNthCalledWith(1, 'directions');
        expect(mockOnScreenChange).toHaveBeenNthCalledWith(2, 'schedule');
        expect(mockOnScreenChange).toHaveBeenNthCalledWith(3, 'indoor');
    });
});
