import { StyleSheet } from 'react-native';
import { Theme } from '@/theme';

export function createStyles(
  stylesFn: (theme: Theme) => any
) {
  return (theme: Theme) => StyleSheet.create(stylesFn(theme));
}