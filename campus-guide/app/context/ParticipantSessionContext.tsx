import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { usePostHog } from "posthog-react-native";

const PARTICIPANT_STORAGE_KEY = "posthog_participant_id";
const TASK_SET_STORAGE_KEY = "posthog_task_set";

export type ParticipantSessionContextValue = {
  participantId: string | null;
  taskSet: string;
  /** True after storage has been read (or session started) */
  isHydrated: boolean;
  startSession: (participantId: string, taskSet: string) => Promise<void>;
};

const ParticipantSessionContext = createContext<ParticipantSessionContextValue | null>(
  null,
);

export function ParticipantSessionProvider({ children }: { readonly children: ReactNode }) {
  const posthog = usePostHog();
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [taskSet, setTaskSet] = useState("");
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [savedId, savedTaskSet] = await Promise.all([
          AsyncStorage.getItem(PARTICIPANT_STORAGE_KEY),
          AsyncStorage.getItem(TASK_SET_STORAGE_KEY),
        ]);
        if (cancelled) return;
        if (savedId) {
          setParticipantId(savedId);
          setTaskSet(savedTaskSet ?? "");
          posthog.identify(`participant_${savedId}`, {
            participant_id: savedId,
            task_set: savedTaskSet ?? "",
          });
        }
      } finally {
        if (!cancelled) setIsHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [posthog]);

  const startSession = useCallback(
    async (id: string, tasks: string) => {
      const trimmed = id.trim() || `anon_${Date.now()}`;
      const ts = tasks.trim();
      // New participant on a shared device: clear PostHog identity so insights
      // count each Start Session as a distinct person (not merged with prior identify).
      posthog.reset();
      await AsyncStorage.multiSet([
        [PARTICIPANT_STORAGE_KEY, trimmed],
        [TASK_SET_STORAGE_KEY, ts],
      ]);
      setParticipantId(trimmed);
      setTaskSet(ts);
      const sessionDate = new Date().toISOString();
      posthog.identify(`participant_${trimmed}`, {
        participant_id: trimmed,
        task_set: ts,
        session_date: sessionDate,
      });
    },
    [posthog],
  );

  const value = useMemo(
    () => ({
      participantId,
      taskSet,
      isHydrated,
      startSession,
    }),
    [participantId, taskSet, isHydrated, startSession],
  );

  return (
    <ParticipantSessionContext.Provider value={value}>
      {children}
    </ParticipantSessionContext.Provider>
  );
}

export function useParticipantSession(): ParticipantSessionContextValue {
  const ctx = useContext(ParticipantSessionContext);
  if (!ctx) {
    throw new Error("useParticipantSession must be used within ParticipantSessionProvider");
  }
  return ctx;
}
