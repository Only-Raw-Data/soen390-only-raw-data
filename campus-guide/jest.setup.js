const React = require("react");
const { View, Text } = require("react-native");
// Mock Expo globals to prevent import scope errors
global.__ExpoImportMetaRegistry = {};

// Mock react-native/src/private/animated/NativeAnimatedHelper for newer React Native versions
jest.mock('react-native/src/private/animated/NativeAnimatedHelper');

jest.mock("react-native-maps", () => {
    const React = require("react");
    const { View, Text } = require("react-native");
  
    const MockMapView = (props) =>
      React.createElement(
        View,
        { ...props, testID: props.testID || "mapView" },
        props.children
      );
  
    // Your tests do getByText('H'), 'MB', etc.
    // Markers don't render text in real maps, so we render the title for testability.
    const MockMarker = ({ title, onPress }) =>
      React.createElement(
        Text,
        { accessibilityRole: "button", onPress },
        title
      );
  
    return {
      __esModule: true,
      default: MockMapView,
      Marker: MockMarker,
      PROVIDER_GOOGLE: "google",
    };
  });

// Mock expo-router
jest.mock('expo-router', () => ({
    Link: 'Link',
    Tabs: 'Tabs',
    useRouter: jest.fn(),
    usePathname: jest.fn(),
}));

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => ({
    Ionicons: 'Ionicons',
    FontAwesome: 'FontAwesome',
}));
