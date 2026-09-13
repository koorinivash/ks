import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { FAB, Searchbar } from 'react-native-paper';

import EmptyState from '../components/EmptyState';
import ErrorView from '../components/ErrorView';
import LoadingView from '../components/LoadingView';
import PersonCard from '../components/PersonCard';
import { RootStackParamList } from '../navigation/types';
import { fetchPeople, getFriendlyErrorMessage } from '../services/api';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { PersonWithStats } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function PeopleScreen() {
  const navigation = useNavigation<Nav>();
  const now = useMemo(() => new Date(), []);
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const [people, setPeople] = useState<PersonWithStats[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (isRefresh = false) => {
      isRefresh ? setRefreshing(true) : setLoading(true);
      setError(null);
      try {
        const data = await fetchPeople({ search: search || undefined, month, year });
        setPeople(data);
      } catch (err) {
        setError(getFriendlyErrorMessage(err));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search, month, year]
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Search people..."
        value={search}
        onChangeText={setSearch}
        onIconPress={() => load()}
        onSubmitEditing={() => load()}
        style={styles.searchbar}
      />

      {loading ? <LoadingView /> : error ? <ErrorView message={error} onRetry={() => load()} /> : people.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title={search ? 'No matching people' : 'No people added yet.'}
          subtitle={search ? 'Try another name or clear your search.' : 'Add your first person to start tracking contributions.'}
          actionLabel="+ Add Person"
          onAction={() => navigation.navigate('AddPerson')}
        />
      ) : (
        <FlatList
          data={people}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
          renderItem={({ item }) => (
            <PersonCard
              person={item}
              month={month}
              year={year}
              onPress={() => navigation.navigate('PersonDetails', { personId: item.id })}
            />
          )}
        />
      )}

      <FAB
        icon="plus"
        style={styles.fab}
        color={colors.textOnPrimary}
        customSize={56}
        onPress={() => navigation.navigate('AddPerson')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchbar: {
    margin: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: 104,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: 28,
  },
});
