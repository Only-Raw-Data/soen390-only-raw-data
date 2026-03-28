import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useParticipantSession } from "@context/ParticipantSessionContext";

export default function ModeratorScreen() {
  const router = useRouter();
  const { startSession } = useParticipantSession();
  const [participantId, setParticipantId] = useState("");
  const [taskSet, setTaskSet] = useState("");

  const handleStart = useCallback(async () => {
    const id = participantId.trim() || `anon_${Date.now()}`;
    await startSession(id, taskSet.trim());
    router.back();
  }, [participantId, taskSet, startSession, router]);

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.label}>Participant ID</Text>
        <TextInput
          style={styles.input}
          value={participantId}
          onChangeText={setParticipantId}
          placeholder="e.g. P01"
          placeholderTextColor="#9CA3AF"
          autoCapitalize="none"
        />
        <Text style={styles.label}>Task set</Text>
        <TextInput
          style={styles.input}
          value={taskSet}
          onChangeText={setTaskSet}
          placeholder="e.g. A / pilot / round 2"
          placeholderTextColor="#9CA3AF"
          autoCapitalize="none"
        />
        <TouchableOpacity style={styles.button} onPress={handleStart}>
          <Text style={styles.buttonText}>Start Session</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: "#111827",
  },
  button: {
    marginTop: 16,
    backgroundColor: "#912338",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
