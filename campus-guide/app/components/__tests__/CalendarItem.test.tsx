import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CalendarItem } from '../CalendarItem';

const baseCalendar = {
  id: 'cal1',
  summary: 'Personal',
  backgroundColor: '#4285F4',
  primary: true,
};

describe('CalendarItem', () => {
  const onSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the calendar summary', () => {
    const { getByText } = render(
      <CalendarItem calendar={baseCalendar} isSelected={false} onSelect={onSelect} />,
    );
    expect(getByText('Personal')).toBeTruthy();
  });

  it('renders description when provided', () => {
    const calendar = { ...baseCalendar, description: 'My personal events' };
    const { getByText } = render(
      <CalendarItem calendar={calendar} isSelected={false} onSelect={onSelect} />,
    );
    expect(getByText('My personal events')).toBeTruthy();
  });

  it('does not render description when absent', () => {
    const { queryByText } = render(
      <CalendarItem calendar={baseCalendar} isSelected={false} onSelect={onSelect} />,
    );
    expect(queryByText(/description/i)).toBeNull();
  });

  it('calls onSelect with calendar id when pressed', () => {
    const { getByRole } = render(
      <CalendarItem calendar={baseCalendar} isSelected={false} onSelect={onSelect} />,
    );
    fireEvent.press(getByRole('button', { name: 'Select Personal calendar' }));
    expect(onSelect).toHaveBeenCalledWith('cal1');
  });

  it('shows checkmark icon when selected', () => {
    const { getByRole } = render(
      <CalendarItem calendar={baseCalendar} isSelected={true} onSelect={onSelect} />,
    );
    const button = getByRole('button', { name: 'Select Personal calendar' });
    expect(button.props.accessibilityState.selected).toBe(true);
  });

  it('does not show selected state when not selected', () => {
    const { getByRole } = render(
      <CalendarItem calendar={baseCalendar} isSelected={false} onSelect={onSelect} />,
    );
    const button = getByRole('button', { name: 'Select Personal calendar' });
    expect(button.props.accessibilityState.selected).toBe(false);
  });

  it('uses PRIMARY_COLOR when backgroundColor is not provided', () => {
    const calendar = { id: 'cal2', summary: 'Holidays', primary: false };
    const { getByText } = render(
      <CalendarItem calendar={calendar} isSelected={false} onSelect={onSelect} />,
    );
    expect(getByText('Holidays')).toBeTruthy();
  });

  it('sets correct accessibility label', () => {
    const { getByRole } = render(
      <CalendarItem calendar={baseCalendar} isSelected={false} onSelect={onSelect} />,
    );
    expect(getByRole('button', { name: 'Select Personal calendar' })).toBeTruthy();
  });
});
