import React, { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Button } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';

import BrandLogo from '../components/BrandLogo';
import ErrorView from '../components/ErrorView';
import LoadingView from '../components/LoadingView';
import MonthYearSelector from '../components/MonthYearSelector';
import SummaryCard from '../components/SummaryCard';
import { APP_NAME } from '../constants';
import { useMonthYear } from '../hooks/useMonthYear';
import { MainTabParamList, RootStackParamList } from '../navigation/types';
import { fetchDashboard, fetchPeople, getFriendlyErrorMessage } from '../services/api';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { DashboardSummary } from '../types';
import { formatCurrency } from '../utils/format';

type TabNav = BottomTabNavigationProp<MainTabParamList, 'Dashboard'>;
type RootNav = NativeStackNavigationProp<RootStackParamList>;

export default function DashboardScreen() {
  const navigation = useNavigation<TabNav>();
  const rootNavigation = navigation.getParent<RootNav>();
  const { month, year, goToPreviousMonth, goToNextMonth } = useMonthYear();

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [hasAnyPeople, setHasAnyPeople] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (isRefresh = false) => {
      isRefresh ? setRefreshing(true) : setLoading(true);
      setError(null);
      try {
        const [dashboardData, people] = await Promise.all([
          fetchDashboard(month, year),
          fetchPeople(),
        ]);
        setSummary(dashboardData);
        setHasAnyPeople(people.length > 0);
      } catch (err) {
        setError(getFriendlyErrorMessage(err));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [month, year]
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) return <LoadingView />;
  if (error) return <ErrorView message={error} onRetry={() => load()} />;

  if (hasAnyPeople === false) {
    return (
      <ScrollView contentContainerStyle={styles.onboardingContainer}>
        <BrandLogo size={112} />
        <Text style={styles.eyebrow}>TOGETHER, EVERY MONTH</Text>
        <Text style={styles.onboardingTitle}>Welcome to {APP_NAME}</Text>
        <Text style={styles.onboardingSubtitle}>
          Manage your monthly{'\n'}contributions easily.
        </Text>
        <Text style={styles.onboardingNote}>Your people. Your contributions.
          All in one place.</Text>
        <Button
          mode="contained"
          buttonColor={colors.primary}
          style={styles.getStartedButton}
          contentStyle={{ paddingVertical: 6 }}
          onPress={() => rootNavigation?.navigate('AddPerson')}
        >
          Get Started
        </Button>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
    >
      <View style={styles.hero}>
        <View style={styles.heroTop}><Text style={styles.eyebrow}>YOUR MONTH AT A GLANCE</Text><Ionicons name="sparkles" size={18} color={colors.primary} /></View>
        <Text style={styles.heroLabel}>Total collected</Text>
        <Text style={styles.heroValue} numberOfLines={1} adjustsFontSizeToFit>{formatCurrency(summary?.collected_amount ?? 0)}</Text>
        <View style={styles.heroFooter}><View style={styles.statusDot} /><Text style={styles.heroNote}>Every contribution, accounted for.</Text></View>
      </View>

      <MonthYearSelector month={month} year={year} onPrevious={goToPreviousMonth} onNext={goToNextMonth} />

      <View style={styles.cardsRow}>
        <SummaryCard
          icon="people"
          iconColor={colors.info}
          iconBg={colors.infoLight}
          label="People"
          value={String(summary?.total_people ?? 0)}
        />
        <SummaryCard
          icon="calendar-outline"
          iconColor={colors.success}
          iconBg={colors.successLight}
          label="Selected month"
          value={`${month.toString().padStart(2, '0')} / ${year}`}
        />
      </View>

      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsGrid}>
        <QuickAction icon="person-add" label="Add Person" onPress={() => rootNavigation?.navigate('AddPerson')} />
        <QuickAction icon="cash" label="Add Payment" onPress={() => rootNavigation?.navigate('AddMoney', { month, year })} />
        <QuickAction
          icon="bar-chart"
          label="Monthly Report"
          onPress={() => navigation.navigate('Reports')}
        />
        <QuickAction
          icon="document-text"
          label="Export Reports"
          onPress={() => navigation.navigate('Reports')}
        />
      </View>
    </ScrollView>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
      style={({ pressed }) => [styles.actionButton, pressed && styles.actionPressed]}>
      <View style={styles.actionIcon}><Ionicons name={icon} size={22} color={colors.primary} /></View>
      <Text style={styles.actionButtonLabel}>{label}</Text>
      <Ionicons name="arrow-forward" size={16} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: spacing.xxl,
  },
  hero: { backgroundColor: colors.surfaceRaised, borderRadius: 24, padding: 24, borderWidth: 1, borderColor: colors.primaryDark, marginBottom: 16 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  eyebrow: { fontSize: 10, letterSpacing: 1.5, fontWeight: '700', color: colors.primary, marginVertical: 16, flexShrink: 1 },
  heroLabel: { color: colors.textSecondary, fontSize: 14, marginTop: 8 },
  heroValue: { color: colors.primaryLight, fontSize: 40, fontWeight: '700', marginTop: 8, marginBottom: 24 },
  heroFooter: { flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 16 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary },
  heroNote: { color: colors.textSecondary, fontSize: 12, flexShrink: 1 },
  actionIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  actionPressed: { backgroundColor: colors.surfaceRaised, transform: [{ scale: 0.97 }] },
  cardsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: '48%',
    minHeight: 140,
    padding: 16,
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
    borderRadius: 20,
  },
  actionButtonLabel: {
    color: colors.textPrimary,
    fontWeight: '600',
    fontSize: 13,
  },
  onboardingContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  onboardingTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  onboardingSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  onboardingNote: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.lg,
    lineHeight: 20,
  },
  getStartedButton: {
    marginTop: spacing.xl,
    borderRadius: 14,
    width: '100%',
    maxWidth: 320,
  },
});
