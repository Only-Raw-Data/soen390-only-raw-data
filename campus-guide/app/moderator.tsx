import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
  InteractionManager,
} from "react-native";
import { useRouter } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { useParticipantSession } from "@context/ParticipantSessionContext";

/** After closing the native modal, wait so the stack animation finishes before firing the survey trigger. */
const COMPLETE_CAPTURE_DELAY_MS = 520;

function captureSessionEvent(
  posthog: ReturnType<typeof usePostHog>,
  participantId: string,
  taskSet: string,
) {
  const payload = {
    participant_id: participantId,
    task_set: taskSet,
  };
  const doCapture = async () => {
    await posthog.ready();
    posthog.capture("usability_session_completed", payload);
    await posthog.flush();
  };
  doCapture().catch(() => {});
}

export default function ModeratorScreen() {
  const router = useRouter();
  const posthog = usePostHog();
  const {
    startSession,
    participantId: sessionParticipantId,
    taskSet: sessionTaskSet,
  } = useParticipantSession();
  const [participantId, setParticipantId] = useState("");
  const [taskSet, setTaskSet] = useState("");

  const handleStart = useCallback(async () => {
    const id = participantId.trim() || `anon_${Date.now()}`;
    await startSession(id, taskSet.trim());
    router.back();
  }, [participantId, taskSet, startSession, router]);

  const handleSessionComplete = useCallback(() => {
    if (!sessionParticipantId) {
      Alert.alert(
        "No active session",
        "Start a participant session first (or have the participant enter their ID on the welcome screen).",
      );
      return;
    }
    router.back();

    InteractionManager.runAfterInteractions(() => {
      setTimeout(
        () => captureSessionEvent(posthog, sessionParticipantId, sessionTaskSet),
        COMPLETE_CAPTURE_DELAY_MS,
      );
    });
  }, [sessionParticipantId, sessionTaskSet, posthog, router]);

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator
      >
      <View style={styles.card}>
        <Text style={styles.hintShort}>
          Tip: long-press &quot;Concordia Campus Guide&quot; in the app header to open this
          screen anytime.
        </Text>
        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>After tasks — exit survey</Text>
        <Text style={styles.hintShort}>
          Tap when the participant is done. PostHog: event usability_session_completed — survey
          must be a popover, shown on mobile, with no URL/page targeting.
        </Text>
        <TouchableOpacity
          style={styles.buttonSecondary}
          onPress={handleSessionComplete}
          testID="moderator-session-complete"
        >
          <Text style={styles.buttonSecondaryText}>
            Mark usability session complete
          </Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>Start participant session</Text>
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
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "flex-start",
    padding: 24,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 20,
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
  hintShort: {
    fontSize: 12,
    lineHeight: 16,
    color: "#6B7280",
    marginBottom: 10,
  },
  buttonSecondary: {
    marginTop: 0,
    borderWidth: 2,
    borderColor: "#912338",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  buttonSecondaryText: {
    color: "#912338",
    fontSize: 15,
    fontWeight: "700",
  },
});
