/**
 * 聊天头像组件
 */
import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { useTheme, Theme } from '@/context/ThemeProvider';
import Icon, { IconNames } from '@/components/Icon';

interface ChatAvatarProps {
  /** 头像类型 */
  type: 'user' | 'ai';
  /** 头像 URL */
  avatarUrl?: string | null;
  /** 用户昵称（用于显示首字母） */
  nickname?: string;
  /** 用户名（用于显示首字母的备选） */
  username?: string;
  /** 尺寸 */
  size?: number;
}

export const ChatAvatar: React.FC<ChatAvatarProps> = ({
  type,
  avatarUrl,
  nickname,
  username,
  size = 36,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme, size);

  if (type === 'ai') {
    return (
      <View style={styles.aiAvatar}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
        ) : (
          <Icon name={IconNames.school} size={size * 0.55} color={theme.colors.primary} />
        )}
      </View>
    );
  }

  return (
    <View style={styles.userAvatar}>
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
      ) : (
        <Text style={styles.userAvatarText}>
          {nickname?.[0] || username?.[0] || '?'}
        </Text>
      )}
    </View>
  );
};

const createStyles = (theme: Theme, size: number) =>
  StyleSheet.create({
    aiAvatar: {
      width: size,
      height: size,
      borderRadius: theme.spacing.borderRadius.sm,
      backgroundColor: theme.colors.background.primary,
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
    },
    userAvatar: {
      width: size,
      height: size,
      borderRadius: theme.spacing.borderRadius.sm,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
    },
    avatarImage: {
      width: size,
      height: size,
      borderRadius: theme.spacing.borderRadius.sm,
    },
    userAvatarText: {
      fontSize: size * 0.44,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text.inverse,
    },
  });

export default ChatAvatar;
