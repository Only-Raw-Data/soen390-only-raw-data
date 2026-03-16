import React from "react";
import Header from "@/app/components/Header";
import IndoorMapView from "@/app/components/IndoorMapView";
import { View, Text, ScrollView } from "react-native";

class IndoorErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    console.error("[IndoorErrorBoundary] caught render error:", error);
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[IndoorErrorBoundary] componentDidCatch:", error.message, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <ScrollView style={{ flex: 1, padding: 16 }}>
          <Text style={{ fontWeight: "bold", color: "red", fontSize: 16, marginBottom: 8 }}>
            Indoor map crashed:
          </Text>
          <Text style={{ color: "red", fontFamily: "monospace" }}>
            {this.state.error.message}
          </Text>
          <Text style={{ color: "#666", marginTop: 8, fontSize: 12 }}>
            {this.state.error.stack}
          </Text>
        </ScrollView>
      );
    }
    return this.props.children;
  }
}

export default function IndoorScreen() {
  return (
    <View style={{ flex: 1 }}>
      <Header />
      <IndoorErrorBoundary>
        <IndoorMapView />
      </IndoorErrorBoundary>
    </View>
  );
}
