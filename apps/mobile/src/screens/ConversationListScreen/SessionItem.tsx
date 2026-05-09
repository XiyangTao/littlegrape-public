import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useTheme } from '@/context/ThemeProvider';
import Icon, { IconNames } from '@/components/Icon';
import { formatListTime } from '@/utils/formatters';
import { createStyles } from './styles';
import type { SessionSummary } from './useConversationList';

interface SessionItemProps {
  item: SessionSummary;
  isLoading: boolean;
  isEditMode: boolean;
  isSelected: boolean;
  avatarUrl: string | null;
  swipeableRefs: React.MutableRefObject<Map<string, Swipeable>>;
  t: (key: string, params?: any) => string;
  onPress: (session: SessionSummary) => void;
  onDelete: (sessionId: string) => void;
  onToggleSelect: (sessionId: string) => void;
  getDisplayRole: (aiRole: string, voiceName: string | null) => string;
  getDisplayScenario: (predefinedScenarioId: string | null, scenario: string) => string;
  getDifficultyLabel: (level: string) => string;
}

function SessionItem({
  item,
  isLoading,
  isEditMode,
  isSelected,
  avatarUrl,
  swipeableRefs,
  t,
  onPress,
  onDelete,
  onToggleSelect,
  getDisplayRole,
  getDisplayScenario,
  getDifficultyLabel,
}: SessionItemProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const renderRightActions = useCallback(() => (
    <TouchableOpacity
      style={styles.deleteButton}
      onPress={() => onDelete(item.sessionId)}
      activeOpacity={0.8}
    >
      <Text style={styles.deleteButtonText}>{t('common.delete')}</Text>
    </TouchableOpacity>
  ), [onDelete, item.sessionId, t, styles]);

  const sessionContent = (
    <>
      {isEditMode && (
        <TouchableOpacity style={styles.checkbox} onPress={() => onToggleSelect(item.sessionId)}>
          <View style={[styles.checkboxInner, isSelected && styles.checkboxChecked]}>
            {isSelected && <Icon name={IconNames.check} size={14} color={theme.colors.text.inverse} />}
          </View>
        </TouchableOpacity>
      )}
      <View style={styles.sessionIcon}>
        {isLoading ? (
          <ActivityIndicator size="small" color={theme.colors.primary} />
        ) : avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.sessionAvatar} />
        ) : (
          <Icon name={IconNames.chat} size={24} color={theme.colors.primary} />
        )}
      </View>
      <View style={styles.sessionContent}>
        <Text style={styles.sessionTitle} numberOfLines={1}>
          {getDisplayRole(item.aiRole, item.voiceName)}
        </Text>
        <Text style={styles.sessionScenario} numberOfLines={1}>
          {getDisplayScenario(item.predefinedScenarioId, item.scenario)}
        </Text>
        <View style={styles.sessionMeta}>
          <Text style={styles.sessionMetaText}>{getDifficultyLabel(item.difficultyLevel)}</Text>
          <Text style={styles.sessionMetaDot}>·</Text>
          <Text style={styles.sessionLastMessage} numberOfLines={1}>
            {item.lastMessage
              ? item.lastMessage.length > 15 ? `${item.lastMessage.substring(0, 15)}...` : item.lastMessage
              : t('conversationList.noMessages')}
          </Text>
        </View>
      </View>
      <View style={styles.sessionRight}>
        <Text style={styles.sessionTime}>{formatListTime(item.updatedAt || item.createdAt, t)}</Text>
        {!isEditMode && <Icon name={IconNames.right} size={20} color={theme.colors.text.disabled} />}
      </View>
    </>
  );

  if (isEditMode) {
    return (
      <TouchableOpacity
        style={[styles.sessionItem, isSelected && styles.sessionItemSelected]}
        onPress={() => onToggleSelect(item.sessionId)}
        activeOpacity={0.7}
      >
        {sessionContent}
      </TouchableOpacity>
    );
  }

  return (
    <Swipeable
      ref={(ref) => {
        if (ref) {
          swipeableRefs.current.set(item.sessionId, ref);
        } else {
          swipeableRefs.current.delete(item.sessionId);
        }
      }}
      renderRightActions={renderRightActions}
      rightThreshold={40}
      overshootRight={false}
    >
      <TouchableOpacity
        style={[styles.sessionItem, isLoading && styles.sessionItemLoading]}
        onPress={() => onPress(item)}
        activeOpacity={0.7}
        disabled={isLoading}
      >
        {sessionContent}
      </TouchableOpacity>
    </Swipeable>
  );
}

export default React.memo(SessionItem);
