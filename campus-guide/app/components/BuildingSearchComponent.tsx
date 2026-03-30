import React from "react";
import { View, TextInput, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  readonly value: string;
  readonly onChangeText: (text: string) => void;
  readonly onSubmitEditing?: () => void;
  readonly placeholder?: string;
};

export default function BuildingSearchHeader({
  value,
  onChangeText,
  onSubmitEditing,
  placeholder = "Search buildings...",
}: Props) {
  return (
    <View style={styles.searchContainer}>
      <View style={styles.searchInputWrapper}>
        <Ionicons
          name="search"
          size={20}
          color="#9CA3AF"
          style={styles.searchIcon}
        />
        <TextInput
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          onSubmitEditing={onSubmitEditing}
          style={styles.searchInput}
          placeholderTextColor="#9CA3AF"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    zIndex: 10,
  },
  searchInputWrapper: {
    position: "relative",
  },
  searchIcon: {
    position: "absolute",
    left: 12,
    top: 10,
    zIndex: 1,
  },
  searchInput: {
    paddingLeft: 40,
    paddingRight: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    fontSize: 16,
  },
});
