import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, Theme } from '@/context/ThemeProvider';
import Icon from '@/components/Icon';

interface EmptyViewProps {
  icon: string;
  iconColor?: string;
  title: string;
  message?: string;
}

export function EmptyView({ icon, iconColor, title, message }: EmptyViewProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <Icon name={icon} size={64} color={iconColor || theme.colors.text.tertiary} />
      <Text style={styles.title}>{title}</Text>
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 40,
    },
    title: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text.primary,
      marginTop: 16,
      marginBottom: 8,
    },
    message: {
      fontSize: 14,
      color: theme.colors.text.secondary,
      textAlign: 'center',
    },
  });
