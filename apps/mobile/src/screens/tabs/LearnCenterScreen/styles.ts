import { StyleSheet } from 'react-native';
import { Theme } from '@/context/ThemeProvider';

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  panel: {
    flex: 1,
  },
  hiddenPanel: {
    display: 'none',
  },
});

export default createStyles;
