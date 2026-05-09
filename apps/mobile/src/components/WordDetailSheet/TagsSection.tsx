/**
 * 标签区：学习状态+词库标签
 */

import React from 'react';
import { View, Text } from 'react-native';
import { useTheme, Theme } from '@/context/ThemeProvider';
import { getLibraryColor } from '@/constants/libraryConfig';
import { createStyles } from './styles';

interface TagsSectionProps {
  status: string;
  statusColor: string;
  statusText: string;
  tags: string[];
  bottomInset: number;
}

export default function TagsSection({
  status,
  statusColor,
  statusText,
  tags,
  bottomInset,
}: TagsSectionProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme, bottomInset);

  return (
    <View style={styles.tagsRow}>
      <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
        <Text style={[styles.statusText, { color: statusColor }]}>
          {statusText}
        </Text>
      </View>
      {tags.map((tag, index) => {
        const tagColor = getLibraryColor(tag, theme.colors.primary);
        return (
          <View key={index} style={[styles.tagBadge, { backgroundColor: tagColor + '20' }]}>
            <Text style={[styles.tagText, { color: tagColor }]}>{tag}</Text>
          </View>
        );
      })}
    </View>
  );
}
