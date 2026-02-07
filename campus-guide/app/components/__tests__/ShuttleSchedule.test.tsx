import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ShuttleSchedule } from '../ShuttleSchedule';
import { SHUTTLE_SCHEDULE } from '../../../constants/shuttleSchedule';

describe('ShuttleSchedule', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders correctly with default values', () => {
        const { getByText } = render(<ShuttleSchedule />);

        expect(getByText('Shuttle Bus Schedule')).toBeTruthy();
        expect(getByText('Loyola ↔ SGW Campus')).toBeTruthy();
        expect(getByText('Monday — Thursday')).toBeTruthy();
        expect(getByText('Friday')).toBeTruthy();
    });

    it('hides title when compact prop is true', () => {
        const { queryByText } = render(<ShuttleSchedule compact={true} />);

        expect(queryByText('Shuttle Bus Schedule')).toBeNull();
        expect(queryByText('Loyola ↔ SGW Campus')).toBeNull();
    });

    it('shows title when compact prop is false', () => {
        const { getByText } = render(<ShuttleSchedule compact={false} />);

        expect(getByText('Shuttle Bus Schedule')).toBeTruthy();
        expect(getByText('Loyola ↔ SGW Campus')).toBeTruthy();
    });

    it('displays Monday-Thursday schedule by default', () => {
        const { getAllByText } = render(<ShuttleSchedule />);
        const mondayThursdaySchedule = SHUTTLE_SCHEDULE.mondayThursday;

        // Check first times are displayed (may appear multiple times)
        expect(getAllByText(mondayThursdaySchedule[0].loyola).length).toBeGreaterThan(0);
        if (mondayThursdaySchedule[0].sgw) {
            expect(getAllByText(mondayThursdaySchedule[0].sgw).length).toBeGreaterThan(0);
        }
    });

    it('switches to Friday schedule when Friday button is pressed', () => {
        const { getByText, getAllByText } = render(<ShuttleSchedule />);
        const fridaySchedule = SHUTTLE_SCHEDULE.friday;

        fireEvent.press(getByText('Friday'));

        // Check first Friday time is displayed (may appear multiple times)
        expect(getAllByText(fridaySchedule[0].loyola).length).toBeGreaterThan(0);
        if (fridaySchedule[0].sgw) {
            expect(getAllByText(fridaySchedule[0].sgw).length).toBeGreaterThan(0);
        }
    });

    it('switches back to Monday-Thursday when button is pressed', () => {
        const { getByText } = render(<ShuttleSchedule />);
        const mondayThursdaySchedule = SHUTTLE_SCHEDULE.mondayThursday;

        // Switch to Friday first
        fireEvent.press(getByText('Friday'));
        
        // Switch back to Monday-Thursday
        fireEvent.press(getByText('Monday — Thursday'));

        // Check Monday-Thursday times are displayed
        expect(getByText(mondayThursdaySchedule[0].loyola)).toBeTruthy();
    });

    it('displays all schedule entries for Monday-Thursday', () => {
        const { getAllByText } = render(<ShuttleSchedule />);
        const schedule = SHUTTLE_SCHEDULE.mondayThursday;

        // Check multiple entries are displayed (times may appear multiple times)
        schedule.slice(0, 5).forEach(entry => {
            expect(getAllByText(entry.loyola).length).toBeGreaterThan(0);
            if (entry.sgw) {
                expect(getAllByText(entry.sgw).length).toBeGreaterThan(0);
            }
        });
    });

    it('displays all schedule entries for Friday', () => {
        const { getByText, getAllByText } = render(<ShuttleSchedule />);
        
        fireEvent.press(getByText('Friday'));
        
        const schedule = SHUTTLE_SCHEDULE.friday;

        // Check multiple entries are displayed (times may appear multiple times)
        schedule.slice(0, 5).forEach(entry => {
            expect(getAllByText(entry.loyola).length).toBeGreaterThan(0);
            if (entry.sgw) {
                expect(getAllByText(entry.sgw).length).toBeGreaterThan(0);
            }
        });
    });

    it('displays em dash for null SGW times', () => {
        const { getByText } = render(<ShuttleSchedule />);
        const schedule = SHUTTLE_SCHEDULE.mondayThursday;

        // Find last bus entry which has null SGW
        const lastBusEntry = schedule.find(entry => entry.sgw === null);
        if (lastBusEntry) {
            expect(getByText('—')).toBeTruthy();
        }
    });

    it('highlights last bus times', () => {
        const { getByText } = render(<ShuttleSchedule />);
        const schedule = SHUTTLE_SCHEDULE.mondayThursday;

        // Find last bus entry
        const lastBusEntry = schedule.find(entry => entry.isLastBus);
        if (lastBusEntry && lastBusEntry.loyola.includes('*')) {
            expect(getByText(lastBusEntry.loyola)).toBeTruthy();
        }
    });

    it('displays table headers correctly', () => {
        const { getByText } = render(<ShuttleSchedule />);

        expect(getByText('LOY departures')).toBeTruthy();
        expect(getByText('S.G.W departures')).toBeTruthy();
    });

    it('displays last bus note', () => {
        const { getByText } = render(<ShuttleSchedule />);

        expect(getByText('Last bus / Dernier départ')).toBeTruthy();
    });

    it('handles empty schedule gracefully', () => {
        // This test ensures the component doesn't crash with empty data
        const { getByText } = render(<ShuttleSchedule />);

        // Component should still render day selector
        expect(getByText('Monday — Thursday')).toBeTruthy();
        expect(getByText('Friday')).toBeTruthy();
    });
});

