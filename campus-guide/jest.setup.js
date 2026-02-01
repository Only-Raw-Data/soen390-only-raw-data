// Mock Expo globals to prevent import scope errors
global.__ExpoImportMetaRegistry = {};

// Mock react-native/src/private/animated/NativeAnimatedHelper for newer React Native versions
jest.mock('react-native/src/private/animated/NativeAnimatedHelper');

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
