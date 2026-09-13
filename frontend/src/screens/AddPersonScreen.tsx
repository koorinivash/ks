import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useHeaderHeight } from '@react-navigation/elements';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, HelperText, Snackbar, TextInput } from 'react-native-paper';

import { RootStackParamList } from '../navigation/types';
import { createPerson, fetchPerson, getFriendlyErrorMessage, updatePerson } from '../services/api';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

type Nav = NativeStackNavigationProp<RootStackParamList, 'AddPerson'>;
type Rt = RouteProp<RootStackParamList, 'AddPerson'>;

export default function AddPersonScreen() {
  const navigation = useNavigation<Nav>();
  const headerHeight = useHeaderHeight();
  const route = useRoute<Rt>();
  const personId = route.params?.personId;
  const isEditing = Boolean(personId);

  const [name, setName] = useState('');
  const [count, setCount] = useState('');
  const [nameError, setNameError] = useState('');
  const [countError, setCountError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState('');
  const [loadingExisting, setLoadingExisting] = useState(isEditing);

  useEffect(() => {
    if (!personId) return;
    (async () => {
      try {
        const person = await fetchPerson(personId);
        setName(person.name);
        setCount(String(person.count ?? 1));
      } catch (err) {
        setSnackbar(getFriendlyErrorMessage(err));
      } finally {
        setLoadingExisting(false);
      }
    })();
  }, [personId]);

  const validate = (): boolean => {
    let valid = true;
    if (!name.trim()) {
      setNameError('Name is required');
      valid = false;
    } else {
      setNameError('');
    }

    const parsedCount = Number(count);
    if (count.trim() === '' || !Number.isInteger(parsedCount) || parsedCount < 1) {
      setCountError('Enter a valid count (1 or more)');
      valid = false;
    } else {
      setCountError('');
    }
    return valid;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        count: Number(count),
      };
      if (isEditing && personId) {
        await updatePerson(personId, payload);
        navigation.goBack();
      } else {
        await createPerson(payload);
        navigation.replace('Main', { screen: 'People' });
      }
    } catch (err) {
      setSnackbar(getFriendlyErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingExisting) return null;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      keyboardVerticalOffset={headerHeight} behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <Text style={styles.title}>{isEditing ? 'Edit Person' : 'Add Person'}</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Name *</Text>
          <TextInput
            mode="outlined"
            placeholder="Enter name"
            value={name}
            onChangeText={setName}
            error={Boolean(nameError)}
            outlineColor={colors.border}
            activeOutlineColor={colors.primary}
          />
          <HelperText type="error" visible={Boolean(nameError)}>
            {nameError}
          </HelperText>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Count *</Text>
          <TextInput
            mode="outlined"
            placeholder="1"
            value={count}
            onChangeText={setCount}
            keyboardType="numeric"
            error={Boolean(countError)}
            outlineColor={colors.border}
            activeOutlineColor={colors.primary}
          />
          <HelperText type="error" visible={Boolean(countError)}>
            {countError}
          </HelperText>
        </View>

        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={submitting}
          disabled={submitting}
          buttonColor={colors.primary}
          style={styles.submitButton}
          contentStyle={{ paddingVertical: 8 }}
        >
          {isEditing ? 'Save Changes' : 'Add Person'}
        </Button>
      </ScrollView>

      <Snackbar visible={Boolean(snackbar)} onDismiss={() => setSnackbar('')} duration={4000}>
        {snackbar}
      </Snackbar>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: 48 },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  field: { marginBottom: spacing.sm },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  submitButton: {
    marginTop: spacing.lg,
    borderRadius: 14,
  },
});
