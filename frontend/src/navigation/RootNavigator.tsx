import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import AddMoneyScreen from '../screens/AddMoneyScreen';
import AddPersonScreen from '../screens/AddPersonScreen';
import PersonDetailsScreen from '../screens/PersonDetailsScreen';
import ScreenFrame from '../components/ScreenFrame';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { colors } from '../theme/colors';
import MainTabNavigator from './MainTabNavigator';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

const AddPerson = () => <ScreenFrame bottom><AddPersonScreen /></ScreenFrame>;
const AddMoney = () => <ScreenFrame bottom><AddMoneyScreen /></ScreenFrame>;
const PersonDetails = () => <ScreenFrame bottom><PersonDetailsScreen /></ScreenFrame>;

export default function RootNavigator() {
  const reduced = useReducedMotion();
  return (
    <Stack.Navigator
      screenOptions={{
        animation: reduced ? 'none' : 'slide_from_right',
        contentStyle: { backgroundColor: colors.background },
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: { fontWeight: '700' },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="Main" component={MainTabNavigator} options={{ headerShown: false }} />
      <Stack.Screen name="AddPerson" component={AddPerson} options={{ title: 'Add Person' }} />
      <Stack.Screen name="PersonDetails" component={PersonDetails} options={{ title: 'Person Details' }} />
      <Stack.Screen name="AddMoney" component={AddMoney} options={{ title: 'Add Payment' }} />
    </Stack.Navigator>
  );
}
