import React from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface RoomSearchBarProps {
  readonly value: string;
  readonly onChangeText: (text: string) => void;
  readonly onSubmit: (text: string) => void;
  readonly onClear: () => void;
  readonly error?: string | null;
  readonly placeholder?: string;
  readonly testIDPrefix?: string;
}

export default function RoomSearchBar({
  value,
  onChangeText,
  onSubmit,
  onClear,
  error,
  placeholder = "Enter room (e.g., H-820)",
  testIDPrefix = "room-search",
}: RoomSearchBarProps) {
  return (
    <View style={styles.container}>
      <View style={styles.inputWrapper}>
        <Ionicons
          name="search"
          size={20}
          color="#6B7280"
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          value={value}
          onChangeText={onChangeText}
          onSubmitEditing={(e) => onSubmit(e.nativeEvent.text)}
          returnKeyType="search"
          autoCapitalize="characters"
          testID={`${testIDPrefix}-input`}
        />
        {value.length > 0 && (
          <TouchableOpacity
            onPress={onClear}
            style={styles.clearButton}
            testID={`${testIDPrefix}-clear`}
          >
            <Ionicons name="close-circle" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#1F2937",
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
  errorText: {
    color: "#DC2626",
    fontSize: 13,
    marginTop: 6,
    marginLeft: 4,
  },
});
