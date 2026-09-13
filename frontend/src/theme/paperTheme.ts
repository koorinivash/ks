import { MD3LightTheme } from 'react-native-paper';
import { colors } from './colors';
export const paperTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.primary, onPrimary: colors.textOnPrimary,
    primaryContainer: colors.surfaceRaised, onPrimaryContainer: colors.primaryLight,
    secondary: colors.accent, secondaryContainer: colors.surfaceRaised, onSecondaryContainer: colors.primaryLight,
    background: colors.background, onBackground: colors.textPrimary,
    surface: colors.surface, onSurface: colors.textPrimary,
    surfaceVariant: colors.surfaceRaised, onSurfaceVariant: colors.textSecondary,
    error: colors.danger, onError: colors.background, outline: colors.border, outlineVariant: colors.border,
    elevation: { level0: 'transparent', level1: colors.surface, level2: colors.surfaceRaised,
      level3: colors.surfaceRaised, level4: colors.surfaceRaised, level5: colors.surfaceRaised },
  },
  roundness: 5,
};
