import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ActivityIndicator, Button, FAB, Searchbar } from 'react-native-paper';

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
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState(false);
  const requestId = useRef(0);
  const busy = useRef(false);
  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timeout);
  }, [search]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (isRefresh = false, nextPage = 1) => {
      if (nextPage > 1 && busy.current) return;
      const id = ++requestId.current;
      busy.current = true;
      setMoreError(false);
      if (nextPage > 1) setLoadingMore(true);
      else {
        setLoadingMore(false);
        isRefresh ? setRefreshing(true) : setLoading(true);
      }
      setError(null);
      try {
        const data = await fetchPeople({ search: debouncedSearch || undefined, month, year, page: nextPage, limit: 20 });
        if (id !== requestId.current) return;
        setPeople((previous) => nextPage === 1 ? data : [...previous, ...data.filter((person) => !previous.some((p) => p.id === person.id))]);
        setPage(nextPage);
        setHasMore(data.length === 20);
      } catch (err) {
        if (id === requestId.current) {
          if (nextPage > 1) setMoreError(true);
          else setError(getFriendlyErrorMessage(err));
        }
      } finally {
        if (id === requestId.current) {
          busy.current = false;
          setLoading(false);
          setRefreshing(false);
          setLoadingMore(false);
        }
      }
    },
    [debouncedSearch, month, year]
  );

  useFocusEffect(
    useCallback(() => {
      load();
      return () => { requestId.current += 1; busy.current = false; };
    }, [load])
  );

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Search people..."
        value={search}
        onChangeText={setSearch}
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
          onEndReached={() => { if (hasMore && !moreError && search === debouncedSearch) load(false, page + 1); }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={loadingMore ? <ActivityIndicator /> : moreError ? <Button onPress={() => load(false, page + 1)}>Retry loading more</Button> : null}
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
