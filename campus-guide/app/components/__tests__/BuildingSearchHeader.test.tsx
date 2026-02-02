import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import BuildingSearchHeader from '../BuildingSearchComponent';

jest.mock('@expo/vector-icons', () => ({
    Ionicons: 'Icon',
  }));  

describe('BuildingSearchHeader', () => {
  it('renders with default placeholder', () => {
    const { getByPlaceholderText } = render(
      <BuildingSearchHeader value="" onChangeText={jest.fn()} />
    );

    expect(getByPlaceholderText('Search buildings...')).toBeTruthy();
  });

  it('renders with custom placeholder', () => {
    const { getByPlaceholderText } = render(
      <BuildingSearchHeader
        value=""
        onChangeText={jest.fn()}
        placeholder="Find a building"
      />
    );

    expect(getByPlaceholderText('Find a building')).toBeTruthy();
  });

  it('displays the passed value', () => {
    const { getByDisplayValue } = render(
      <BuildingSearchHeader value="EV Building" onChangeText={jest.fn()} />
    );

    expect(getByDisplayValue('EV Building')).toBeTruthy();
  });

  it('calls onChangeText when typing', () => {
    const mockChange = jest.fn();

    const { getByPlaceholderText } = render(
      <BuildingSearchHeader value="" onChangeText={mockChange} />
    );

    fireEvent.changeText(getByPlaceholderText('Search buildings...'), 'MB');

    expect(mockChange).toHaveBeenCalledWith('MB');
  });
});
