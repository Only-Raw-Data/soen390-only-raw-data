/* eslint-disable react/prop-types */
const React = require("react");
const { View, Text } = require("react-native");
// Mock Expo globals to prevent import scope errors
globalThis.__ExpoImportMetaRegistry = {};

// Mock react-native/src/private/animated/NativeAnimatedHelper for newer React Native versions
jest.mock("react-native/src/private/animated/NativeAnimatedHelper");

jest.mock("react-native-maps", () => {
  const React = require("react");
  const { View, Text } = require("react-native");

  const MockMapView = React.forwardRef((props, ref) => {
    React.useImperativeHandle(ref, () => ({
      animateToRegion: jest.fn(),
      fitToCoordinates: jest.fn(),
    }));
    return React.createElement(
      View,
      { ...props, testID: props.testID || "mapView" },
      props.children,
    );
  });

  // Your tests do getByText('H'), 'MB', etc.
  // Markers don't render text in real maps, so we render the title for testability.
  const MockMarker = ({ title, onPress, children }) =>
    React.createElement(View, { accessibilityRole: "button", onPress },
      title ? React.createElement(Text, null, title) : null,
      children,
    );

  // Mock Polygon for building outlines
  const MockPolygon = ({ onPress, testID, coordinates }) =>
    React.createElement(View, {
      testID: testID || "polygon",
      onTouchEnd: onPress,
      accessibilityLabel: `polygon-${coordinates?.length || 0}-coords`,
    });

  // Mock Polyline for indoor path rendering
  const MockPolyline = ({ testID, coordinates }) =>
    React.createElement(View, {
      testID: testID || "polyline",
      accessibilityLabel: `polyline-${coordinates?.length || 0}-coords`,
    });

  return {
    __esModule: true,
    default: MockMapView,
    Marker: MockMarker,
    Polygon: MockPolygon,
    Polyline: MockPolyline,
    PROVIDER_GOOGLE: "google",
  };
});

// Mock expo-router
jest.mock("expo-router", () => ({
  Link: "Link",
  Tabs: "Tabs",
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}));

// Mock @expo/vector-icons
jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
  FontAwesome: "FontAwesome",
}));

// Mock expo-file-system/next
jest.mock('expo-file-system/next', () => ({
  Directory: jest.fn().mockImplementation(() => ({
    exists: true,
    create: jest.fn(),
  })),
  File: jest.fn().mockImplementation(() => ({
    exists: false,
    text: jest.fn().mockResolvedValue('{}'),
    write: jest.fn(),
  })),
  Paths: {
    cache: 'cache_dir',
  },
}));
