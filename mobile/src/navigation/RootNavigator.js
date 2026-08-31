import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { getTheme, planetAccents } from '../theme';
import BridgeScreen from '../screens/BridgeScreen';
import FirstMateScreen from '../screens/FirstMateScreen';
import GalleyScreen from '../screens/GalleyScreen';
import AtlasScreen from '../screens/AtlasScreen';
import LumenScreen from '../screens/LumenScreen';
import ObservatoryScreen from '../screens/ObservatoryScreen';
import WorldScreen from '../screens/WorldScreen';
import SettingsScreen from '../screens/SettingsScreen';
import SignalLogScreen from '../screens/SignalLogScreen';
import AccountScreen from '../screens/AccountScreen';
import SynthesisScreen from '../screens/SynthesisScreen';

const Stack = createNativeStackNavigator();

// Planets are pushed on top of the Bridge, so backing out always returns to the
// cockpit. Headers are hidden because each planet draws its own.
const RootNavigator = () => {
  const theme = getTheme(true);

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.backgroundDeep },
        animation: 'fade',
      }}
    >
      <Stack.Screen name="Bridge" component={BridgeScreen} />
      <Stack.Screen name="FirstMate" component={FirstMateScreen} />
      <Stack.Screen name="Galley" component={GalleyScreen} />
      <Stack.Screen name="Atlas" component={AtlasScreen} />
      <Stack.Screen name="Lumen" component={LumenScreen} />
      <Stack.Screen name="Observatory" component={ObservatoryScreen} />
      <Stack.Screen name="World" component={WorldScreen} />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="SignalLog"
        component={SignalLogScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="Account"
        component={AccountScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="Synthesis"
        component={SynthesisScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
    </Stack.Navigator>
  );
};

export const navigationTheme = {
  dark: true,
  colors: {
    primary: planetAccents.lumen.mid,
    background: '#03050B',
    card: '#090D1A',
    text: '#F4F8FF',
    border: 'rgba(111, 219, 255, 0.18)',
    notification: planetAccents.atlas.mid,
  },
  fonts: {
    regular: { fontFamily: 'System', fontWeight: '400' },
    medium: { fontFamily: 'System', fontWeight: '500' },
    bold: { fontFamily: 'System', fontWeight: '700' },
    heavy: { fontFamily: 'System', fontWeight: '800' },
  },
};

export default RootNavigator;
