import NextClassDirectionsBanner from "@app/components/NextClassDirectionsBanner";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";

export default function Header() {
  const router = useRouter();

  const openModerator = () => {
    router.push("/moderator" as any);
  };

  return (
    <View style={styles.header}>
      <Pressable
        onLongPress={openModerator}
        delayLongPress={700}
        hitSlop={12}
        accessibilityLabel="Concordia Campus Guide"
      >
        <Text style={styles.headerTitle}>Concordia Campus Guide</Text>
      </Pressable>
      <NextClassDirectionsBanner />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#912338",
    paddingTop: 48,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
  },
});
