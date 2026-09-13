import React from 'react';
import { Button, Dialog, Portal, Text } from 'react-native-paper';
import { colors } from '../theme/colors';

interface Props {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
}

export default function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Delete',
  destructive = true,
  onConfirm,
  onDismiss,
}: Props) {
  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss}>
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium">{message}</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss} textColor={colors.textSecondary}>
            Cancel
          </Button>
          <Button onPress={onConfirm} textColor={destructive ? colors.danger : colors.primary}>
            {confirmLabel}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
