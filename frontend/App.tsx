import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import RootNavigator from './src/navigation/RootNavigator';
import { paperTheme } from './src/theme/paperTheme';

const navigationTheme = { ...DefaultTheme, colors: { ...DefaultTheme.colors,
  primary: paperTheme.colors.primary, background: paperTheme.colors.background,
  card: paperTheme.colors.surface, text: paperTheme.colors.onSurface, border: paperTheme.colors.outline,
} };

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={paperTheme}>
        <NavigationContainer theme={navigationTheme}>
          <StatusBar style="dark" />
          <RootNavigator />
        </NavigationContainer>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
