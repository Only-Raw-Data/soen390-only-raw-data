import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import BuildingSearchHeader from '../BuildingSearchComponent';

jest.mock('@expo/vector-icons', () => ({
    Ionicons: 'Icon',
  }));  

describe('BuildingSearchHeader', () => {
  it('renders with default placeholder', () => {
    // Arrange
    const { getByPlaceholderText } = render(
      <BuildingSearchHeader value="" onChangeText={jest.fn()} />
    )
    // Act
    const input = getByPlaceholderText('Search buildings...');
    // Assert
    expect(input).toBeTruthy();
  });

  it('renders with custom placeholder', () => {
    // Arrange
    const { getByPlaceholderText } = render(
      <BuildingSearchHeader
        value=""
        onChangeText={jest.fn()}
        placeholder="Find a building"
      />
    );
   // Act
    const input = getByPlaceholderText('Find a building');
    // Assert
    expect(input).toBeTruthy();
  });

  it('displays the passed value', () => {
    // Arrange
    const { getByDisplayValue } = render(
      <BuildingSearchHeader value="EV Building" onChangeText={jest.fn()} />
    );
    // Act
    const value = getByDisplayValue('EV Building');
    // Assert
    expect(value).toBeTruthy();
  });

  it('calls onChangeText when typing', () => {
    // Arrange
    const mockChange = jest.fn();

    const { getByPlaceholderText } = render(
      <BuildingSearchHeader value="" onChangeText={mockChange} />
    );
    // Act
    fireEvent.changeText(getByPlaceholderText('Search buildings...'), 'MB');
    // Assert
    expect(mockChange).toHaveBeenCalledWith('MB');
  });
});
