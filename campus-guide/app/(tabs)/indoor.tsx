import Header from "@/app/components/Header";
import IndoorMapView from "@/app/components/IndoorMapView";
import { View } from "react-native";

export default function IndoorScreen() {
  return (
    <View style={{ flex: 1 }}>
      <Header />
      <IndoorMapView />
    </View>
  );
}
