import Header from "../components/Header";
import IndoorMapView from "../components/IndoorMapView";
import { View } from "react-native";

export default function IndoorScreen() {
  return (
    <View style={{ flex: 1 }}>
      <Header />
      <IndoorMapView />
    </View>
  );
}
