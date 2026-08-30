import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { getTheme, spacing, typography } from './src/theme';
import { GalaxyProvider, useGalaxy } from './src/state/GalaxyContext';
import RootNavigator, { navigationTheme } from './src/navigation/RootNavigator';

const theme = getTheme(true);

const Boot = ({ children }) => {
  const { ready, error } = useGalaxy();

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={[styles.errorTitle, typography.hud]}>Systems offline</Text>
        <Text style={styles.errorBody}>{error}</Text>
      </View>
    );
  }

  if (!ready) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.palette.plasma[400]} />
        <Text style={[styles.bootText, typography.hud]}>Spinning up the system</Text>
      </View>
    );
  }

  return children;
};

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <GalaxyProvider>
          <Boot>
            <NavigationContainer theme={navigationTheme}>
              <RootNavigator />
            </NavigationContainer>
          </Boot>
          <StatusBar style="light" />
        </GalaxyProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.backgroundDeep },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.backgroundDeep,
    padding: spacing.xl,
  },
  bootText: {
    color: theme.colors.text.tertiary,
    fontSize: 11,
    letterSpacing: 2.5,
    marginTop: spacing.base,
  },
  errorTitle: { color: theme.palette.status.bad, fontSize: 14, letterSpacing: 2 },
  errorBody: {
    color: theme.colors.text.secondary,
    fontSize: typography.sizes.sm,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
