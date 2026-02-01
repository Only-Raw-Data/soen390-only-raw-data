import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { MapView } from '../MapView';

describe('MapView', () => {
    it('renders without crashing', () => {
        const { getByPlaceholderText } = render(<MapView />);
        expect(getByPlaceholderText('Search buildings...')).toBeTruthy();
    });

    it('renders campus toggle buttons', () => {
        const { getByText } = render(<MapView />);

        expect(getByText('SGW Campus')).toBeTruthy();
        expect(getByText('Loyola Campus')).toBeTruthy();
    });

    it('defaults to SGW campus', () => {
        const { getByText } = render(<MapView />);

        expect(getByText('Sir George Williams Campus')).toBeTruthy();
    });

    it('switches back to SGW campus', () => {
        const { getByText } = render(<MapView />);

        fireEvent.press(getByText('Loyola Campus'));
        fireEvent.press(getByText('SGW Campus'));

        expect(getByText('Sir George Williams Campus')).toBeTruthy();
    });

    describe('Search functionality', () => {
        it('filters buildings by name', () => {
            const { getByPlaceholderText, getByText, queryByText } = render(<MapView />);
            const searchInput = getByPlaceholderText('Search buildings...');

            fireEvent.changeText(searchInput, 'Hall');

            // Henry F. Hall Building should be visible
            expect(getByText('H')).toBeTruthy();
        });

        it('filters buildings by code', () => {
            const { getByPlaceholderText, getByText } = render(<MapView />);
            const searchInput = getByPlaceholderText('Search buildings...');

            fireEvent.changeText(searchInput, 'MB');

            expect(getByText('MB')).toBeTruthy();
        });

        it('is case insensitive', () => {
            const { getByPlaceholderText, getByText } = render(<MapView />);
            const searchInput = getByPlaceholderText('Search buildings...');

            fireEvent.changeText(searchInput, 'engineering');

            expect(getByText('EV')).toBeTruthy();
        });

        it('clears search results when input is cleared', () => {
            const { getByPlaceholderText, getByText } = render(<MapView />);
            const searchInput = getByPlaceholderText('Search buildings...');

            fireEvent.changeText(searchInput, 'Hall');
            fireEvent.changeText(searchInput, '');

            // All SGW buildings should be visible again
            expect(getByText('H')).toBeTruthy();
            expect(getByText('MB')).toBeTruthy();
            expect(getByText('EV')).toBeTruthy();
        });
    });

    describe('Building markers', () => {
        it('renders SGW building markers', () => {
            const { getByText } = render(<MapView />);

            expect(getByText('H')).toBeTruthy();
            expect(getByText('MB')).toBeTruthy();
            expect(getByText('EV')).toBeTruthy();
            expect(getByText('LB')).toBeTruthy();
            expect(getByText('VA')).toBeTruthy();
            expect(getByText('GM')).toBeTruthy();
        });

        it('renders Loyola building markers when campus is switched', () => {
            const { getByText } = render(<MapView />);

            fireEvent.press(getByText('Loyola Campus'));

            expect(getByText('CC')).toBeTruthy();
            expect(getByText('SP')).toBeTruthy();
            expect(getByText('AD')).toBeTruthy();
            expect(getByText('FC')).toBeTruthy();
            expect(getByText('PC')).toBeTruthy();
        });

        it('shows current location indicator', () => {
            const { getByText } = render(<MapView />);

            expect(getByText('You are here')).toBeTruthy();
        });
    });

    describe('Building selection', () => {

        it('shows Get Directions button in building info', () => {
            const { getByText } = render(<MapView />);

            fireEvent.press(getByText('H'));

            expect(getByText('Get Directions')).toBeTruthy();
        });

        it('clears selected building when switching campuses', () => {
            const { getByText, queryByText } = render(<MapView />);

            // Select a building on SGW campus
            fireEvent.press(getByText('H'));
            expect(getByText('Henry F. Hall Building')).toBeTruthy();

            // Switch to Loyola campus
            fireEvent.press(getByText('Loyola Campus'));

            // Building info should be cleared
            expect(queryByText('Henry F. Hall Building')).toBeNull();
        });
    });

    describe('Integration tests', () => {
        it('search works across campus switches', () => {
            const { getByPlaceholderText, getByText } = render(<MapView />);
            const searchInput = getByPlaceholderText('Search buildings...');

            // Search on SGW campus
            fireEvent.changeText(searchInput, 'Hall');
            expect(getByText('H')).toBeTruthy();

            // Switch to Loyola
            fireEvent.press(getByText('Loyola Campus'));

            // Search should still work
            fireEvent.changeText(searchInput, 'Central');
            expect(getByText('CC')).toBeTruthy();
        });

        it('handles selecting different buildings', () => {
            const { getByText } = render(<MapView />);

            // Select first building
            fireEvent.press(getByText('H'));
            expect(getByText('Henry F. Hall Building')).toBeTruthy();

            // Select second building
            fireEvent.press(getByText('MB'));
            expect(getByText('John Molson Building')).toBeTruthy();

            // First building info should be replaced
            expect(getByText('John Molson Building')).toBeTruthy();
        });
    });
});
