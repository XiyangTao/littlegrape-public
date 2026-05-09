/**
 * 快捷操作组件
 * 横向滚动的快捷操作按钮
 */

import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import Icon, { IconNames } from '@/components/Icon';
import type { QuickActionType } from '@/types/assistant';
import { createStyles } from './styles';

interface QuickAction {
  type: QuickActionType;
  labelKey: string;
  icon: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { type: 'daily_summary', labelKey: 'assistant.quickActions.dailySummary', icon: IconNames.history },
  { type: 'review_remind', labelKey: 'assistant.quickActions.reviewRemind', icon: IconNames.refresh },
  { type: 'weak_analysis', labelKey: 'assistant.quickActions.weakAnalysis', icon: IconNames.search },
  { type: 'study_advice', labelKey: 'assistant.quickActions.studyAdvice', icon: IconNames.lightbulb },
  { type: 'encourage', labelKey: 'assistant.quickActions.encourage', icon: IconNames.star },
];

interface QuickActionsProps {
  onAction: (type: QuickActionType) => void;
  disabled?: boolean;
}

export default function QuickActions({ onAction, disabled }: QuickActionsProps) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const styles = createStyles(theme);

  return (
    <View style={styles.quickActionsContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.quickActionsScroll}
      >
        {QUICK_ACTIONS.map((action) => (
          <TouchableOpacity
            key={action.type}
            style={styles.quickActionButton}
            onPress={() => onAction(action.type)}
            disabled={disabled}
            activeOpacity={0.7}
          >
            <Icon
              name={action.icon}
              size={16}
              color={theme.colors.text.primary}
              style={styles.quickActionIcon}
            />
            <Text style={styles.quickActionText}>{t(action.labelKey)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
