import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DashboardScreen from '../screens/DashboardScreen';
import MonthlyFinanceScreen from '../screens/MonthlyFinanceScreen';
import PeopleScreen from '../screens/PeopleScreen';
import ReportsScreen from '../screens/ReportsScreen';
import BrandLogo from '../components/BrandLogo';
import ScreenFrame from '../components/ScreenFrame';
import { colors } from '../theme/colors';
import { MainTabParamList } from './types';
const Tab = createBottomTabNavigator<MainTabParamList>();
const ICONS: Record<keyof MainTabParamList, keyof typeof Ionicons.glyphMap> = {
  Dashboard: 'grid-outline', People: 'people-outline', Monthly: 'calendar-outline', Reports: 'document-text-outline',
};
const TITLES = { Dashboard: 'Your overview', People: 'Your people', Monthly: 'Monthly ledger', Reports: 'Reports & exports' };
const Home = () => <ScreenFrame><DashboardScreen /></ScreenFrame>;
const People = () => <ScreenFrame><PeopleScreen /></ScreenFrame>;
const Monthly = () => <ScreenFrame><MonthlyFinanceScreen /></ScreenFrame>;
const Reports = () => <ScreenFrame><ReportsScreen /></ScreenFrame>;
export default function MainTabNavigator() {
  const insets = useSafeAreaInsets();
  return <Tab.Navigator screenOptions={({ route }) => ({
    header: () => <SafeAreaView edges={['top', 'left', 'right']} style={styles.header}>
      <View style={styles.brand}><BrandLogo /><View style={styles.brandCopy}>
        <Text style={styles.name}>KS</Text><Text style={styles.subtitle}>{TITLES[route.name]}</Text>
      </View><View style={styles.seal}><Ionicons name="sparkles-outline" size={20} color={colors.primary} /></View></View>
    </SafeAreaView>,
    tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: colors.textMuted,
    tabBarIcon: ({ color, focused }) => <View style={[styles.icon, focused && styles.activeIcon]}><Ionicons name={ICONS[route.name]} size={21} color={color} /></View>,
    tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, height: 70 + insets.bottom,
      paddingBottom: Math.max(insets.bottom, 8), paddingTop: 8 },
    tabBarLabelStyle: { fontSize: 11, fontWeight: '600' }, tabBarLabelPosition: 'below-icon',
  })}>
    <Tab.Screen name="Dashboard" component={Home} options={{ title: 'Home' }} />
    <Tab.Screen name="People" component={People} />
    <Tab.Screen name="Monthly" component={Monthly} />
    <Tab.Screen name="Reports" component={Reports} />
  </Tab.Navigator>;
}
const styles = StyleSheet.create({
  header: { backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.border },
  brand: { width: '100%', maxWidth: 720, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, gap: 12 },
  brandCopy: { flex: 1 }, name: { fontSize: 25, fontWeight: '800', letterSpacing: 4, color: colors.primaryLight },
  subtitle: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  seal: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  icon: { width: 48, height: 30, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  activeIcon: { backgroundColor: colors.surfaceRaised },
});
