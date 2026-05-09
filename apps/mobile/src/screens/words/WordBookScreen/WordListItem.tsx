import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme, Theme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import Icon from '@/components/Icon';
import type { WordWithProgress } from './useWordBook';

// 获取状态颜色
const getStatusColor = (theme: Theme, status?: string) => {
  switch (status) {
    case 'learned': return theme.colors.warning;
    case 'mastered': return theme.colors.success;
    default: return theme.colors.text.disabled;
  }
};

// 获取状态文本
const getStatusText = (t: (key: string) => string, status?: string, isSkipped?: boolean) => {
  if (isSkipped) return t('words.masteredSkipped');
  switch (status) {
    case 'learned': return t('words.learningStatus');
    case 'mastered': return t('words.masteredStatus');
    default: return t('wordBook.statusNew');
  }
};

interface WordListItemProps {
  item: WordWithProgress;
  styles: any;
  onPress: (word: WordWithProgress) => void;
  batchMode?: boolean;
  isSelected?: boolean;
}

const WordListItem = React.memo(({ item, styles, onPress, batchMode, isSelected }: WordListItemProps) => {
  const { theme } = useTheme();
  const { t } = useI18n();
  const status = item.progress?.status || 'new';
  const isSkipped = item.progress?.isSkipped === 1;
  const isMastered = status === 'mastered' || isSkipped;
  const statusColor = isSkipped ? theme.colors.success : getStatusColor(theme, status);
  // 长单词（超过12个字符）使用较小字号
  const isLongWord = item.word.length > 12;

  return (
    <TouchableOpacity
      style={styles.wordItem}
      activeOpacity={batchMode && isMastered ? 1 : 0.7}
      onPress={batchMode && isMastered ? undefined : () => onPress(item)}
    >
      {batchMode && (
        <View style={styles.checkboxContainer}>
          <Icon
            name={isMastered || isSelected ? 'check-box' : 'check-box-outline-blank'}
            size={22}
            color={isMastered ? theme.colors.text.disabled : isSelected ? theme.colors.primary : theme.colors.text.disabled}
          />
        </View>
      )}

      <View style={styles.wordItemLeft}>
        {/* 单词 */}
        <Text
          style={[
            styles.wordItemText,
            isLongWord && styles.wordItemTextSmall,
          ]}
          numberOfLines={1}
        >
          {item.word}
        </Text>
        {/* 释义（词性 + 中文释义，最多2行） */}
        <Text style={styles.wordItemMeaning} numberOfLines={2}>
          {item.pos && <Text style={styles.wordPos}>{item.pos} </Text>}
          {item.meaningCn}
        </Text>
      </View>

      {!batchMode && (
        <View style={styles.wordItemRight}>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {getStatusText(t, status, isSkipped)}
            </Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
});

export default WordListItem;
