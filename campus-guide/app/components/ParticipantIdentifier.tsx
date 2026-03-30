import React, { useState, useEffect, useCallback } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useParticipantSession } from "@context/ParticipantSessionContext";

export default function ParticipantIdentifier({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  const { participantId, isHydrated, startSession } = useParticipantSession();
  const [visible, setVisible] = useState(false);
  const [value, setValue] = useState("");

  useEffect(() => {
    if (!isHydrated) return;
    if (!participantId) {
      setVisible(true);
    }
  }, [isHydrated, participantId]);

  const handleSubmit = useCallback(() => {
    const id = value.trim() || `anon_${Date.now()}`;
    void startSession(id, "");
    setVisible(false);
  }, [value, startSession]);

  return (
    <>
      {children}
      <Modal visible={visible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.card}>
            <Text style={styles.title}>Usability Test</Text>
            <Text style={styles.subtitle}>
              Enter your participant ID to begin
            </Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. P01"
              placeholderTextColor="#9CA3AF"
              value={value}
              onChangeText={setValue}
              autoFocus
            />
            <TouchableOpacity style={styles.button} onPress={handleSubmit}>
              <Text style={styles.buttonText}>Start Session</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    width: "85%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 20,
  },
  input: {
    width: "100%",
    height: 48,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    paddingHorizontal: 14,
    fontSize: 16,
    color: "#111827",
    marginBottom: 16,
  },
  button: {
    width: "100%",
    height: 48,
    borderRadius: 10,
    backgroundColor: "#912338",
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
