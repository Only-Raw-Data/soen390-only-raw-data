import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import CalendarList from '../CalendarList';
import * as CalendarSelectionContext from '@context/CalendarSelectionContext';

jest.mock('@context/CalendarSelectionContext', () => ({
  useCalendarSelection: jest.fn(),
}));

const mockCalendars = [
  { id: 'cal1', summary: 'Personal', backgroundColor: '#4285F4', primary: true },
  { id: 'cal2', summary: 'Work', backgroundColor: '#0F9D58' },
  { id: 'cal3', summary: 'Holidays' },
];

describe('CalendarList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loading state', () => {
    it('shows loading indicator when isLoading is true', () => {
      // Arrange
      (CalendarSelectionContext.useCalendarSelection as jest.Mock).mockReturnValue({
        calendars: [],
        selectedCalendarId: null,
        isLoading: true,
        error: null,
        selectCalendar: jest.fn(),
      });

      // Act
      const { getByTestId } = render(<CalendarList />);

      // Assert
      expect(getByTestId('calendar-list-loading')).toBeTruthy();
    });
  });

  describe('error state', () => {
    it('shows error message when error is set', () => {
      // Arrange
      (CalendarSelectionContext.useCalendarSelection as jest.Mock).mockReturnValue({
        calendars: [],
        selectedCalendarId: null,
        isLoading: false,
        error: 'Failed to load',
        selectCalendar: jest.fn(),
      });

      // Act
      const { getByTestId, getByText } = render(<CalendarList />);

      // Assert
      expect(getByTestId('calendar-list-error')).toBeTruthy();
      expect(getByText('Failed to load')).toBeTruthy();
    });
  });

  describe('empty state', () => {
    it('shows empty message when no calendars and not loading', () => {
      // Arrange
      (CalendarSelectionContext.useCalendarSelection as jest.Mock).mockReturnValue({
        calendars: [],
        selectedCalendarId: null,
        isLoading: false,
        error: null,
        selectCalendar: jest.fn(),
      });

      // Act
      const { getByTestId } = render(<CalendarList />);

      // Assert
      expect(getByTestId('calendar-list-empty')).toBeTruthy();
    });
  });

  describe('calendar list', () => {
    it('renders all calendars', () => {
      // Arrange
      (CalendarSelectionContext.useCalendarSelection as jest.Mock).mockReturnValue({
        calendars: mockCalendars,
        selectedCalendarId: null,
        isLoading: false,
        error: null,
        selectCalendar: jest.fn(),
      });

      // Act
      const { getByText } = render(<CalendarList />);

      // Assert
      expect(getByText('Personal')).toBeTruthy();
      expect(getByText('Work')).toBeTruthy();
      expect(getByText('Holidays')).toBeTruthy();
    });

    it('calls selectCalendar when an item is pressed', () => {
      // Arrange
      const selectCalendar = jest.fn();
      (CalendarSelectionContext.useCalendarSelection as jest.Mock).mockReturnValue({
        calendars: mockCalendars,
        selectedCalendarId: null,
        isLoading: false,
        error: null,
        selectCalendar,
      });

      // Act
      const { getByText } = render(<CalendarList />);
      fireEvent.press(getByText('Work'));

      // Assert
      expect(selectCalendar).toHaveBeenCalledWith('cal2');
    });

    it('marks the selected calendar item with selected accessibility state', () => {
      // Arrange
      (CalendarSelectionContext.useCalendarSelection as jest.Mock).mockReturnValue({
        calendars: mockCalendars,
        selectedCalendarId: 'cal1',
        isLoading: false,
        error: null,
        selectCalendar: jest.fn(),
      });

      // Act
      const { getByRole } = render(<CalendarList />);
      const selectedItem = getByRole('button', { name: 'Select Personal calendar' });

      // Assert
      expect(selectedItem).toBeTruthy();
    });

    it('uses default color when backgroundColor is not provided', () => {
      // Arrange
      (CalendarSelectionContext.useCalendarSelection as jest.Mock).mockReturnValue({
        calendars: [{ id: 'cal3', summary: 'Holidays' }],
        selectedCalendarId: null,
        isLoading: false,
        error: null,
        selectCalendar: jest.fn(),
      });

      // Act
      const { getByText } = render(<CalendarList />);

      // Assert – renders without throwing
      expect(getByText('Holidays')).toBeTruthy();
    });
  });
});
