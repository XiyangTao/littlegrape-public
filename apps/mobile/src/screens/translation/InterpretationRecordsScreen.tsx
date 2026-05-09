import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme, Theme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import { useAuthStore } from '@/stores/AuthStore';
import { useCustomAlert } from '@/hooks/useCustomAlert';
import Icon from '@/components/Icon';
import { getRecords, removeInterpretationRecord, removeAllInterpretationRecords } from '@/services/InterpretationRecordService';
import type { InterpretationRecordRow } from '@/db/InterpretationRecordDB';

export default function InterpretationRecordsScreen() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const navigation = useNavigation<any>();
  const userId = useAuthStore(s => s.user?.id);
  const { confirm, AlertComponent } = useCustomAlert();
  const styles = createStyles(theme);

  const [records, setRecords] = useState<InterpretationRecordRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const langLabels = useMemo<Record<string, string>>(() => ({
    zh: t('interpretation.langZh'),
    en: t('interpretation.langEn'),
    zhen: t('interpretation.langZhEn'),
  }), [t]);

  const loadRecords = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }
    try {
      const data = await getRecords(userId, 100);
      setRecords(data);
    } catch (err) {
      console.error('Load records failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // 每次页面聚焦时刷新
  useFocusEffect(useCallback(() => {
    loadRecords();
  }, [loadRecords]));

  const handleDelete = useCallback((record: InterpretationRecordRow) => {
    if (!userId) return;
    confirm(
      t('interpretation.deleteTitle'),
      t('interpretation.deleteMessage'),
      async () => {
        await removeInterpretationRecord(userId, record.id);
        setRecords(prev => prev.filter(r => r.id !== record.id));
      },
      undefined,
      'error',
    );
  }, [userId, t, confirm]);

  const handleClearAll = useCallback(() => {
    if (!userId) return;
    confirm(
      t('interpretation.clearAllTitle'),
      t('interpretation.clearAllMessage'),
      async () => {
        await removeAllInterpretationRecords(userId);
        setRecords([]);
      },
      undefined,
      'error',
    );
  }, [userId, t, confirm]);

  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hour = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${month}/${day} ${hour}:${min}`;
  };

  const renderItem = useCallback(({ item }: { item: InterpretationRecordRow }) => {
    const sourceLang = langLabels[item.sourceLanguage] || item.sourceLanguage;
    const targetLang = langLabels[item.targetLanguage] || item.targetLanguage;
    const hasAudio = !!(item.sourceAudioPath || item.translationAudioPath);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('InterpretationRecordDetail', { recordId: item.id })}
        onLongPress={() => handleDelete(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardDate}>{formatDate(item.createdAt)}</Text>
          <Text style={styles.cardDuration}>{formatDuration(item.durationMs)}</Text>
        </View>
        <View style={styles.cardBody}>
          <View style={styles.langRow}>
            <Text style={styles.langText}>{sourceLang}</Text>
            <Icon name="arrow-forward" size={14} color={theme.colors.text.tertiary} />
            <Text style={styles.langText}>{targetLang}</Text>
          </View>
          <View style={styles.badges}>
            {item.mode === 's2s' && (
              <View style={styles.badge}>
                <Icon name="volume-up" size={10} color={theme.colors.primary} />
                <Text style={styles.badgeText}>{t('translation.modeVoiceText')}</Text>
              </View>
            )}
            {hasAudio && (
              <View style={styles.badge}>
                <Icon name="mic" size={10} color={theme.colors.success} />
                <Text style={styles.badgeText}>{t('interpretation.hasRecording')}</Text>
              </View>
            )}
          </View>
        </View>
        {/* 预览第一条字幕 */}
        {item.transcript && (() => {
          try {
            const segs = JSON.parse(item.transcript);
            const first = segs.find((s: any) => s.sourceText);
            if (first) {
              return (
                <Text style={styles.preview} numberOfLines={1}>
                  {first.sourceText}
                </Text>
              );
            }
          } catch { /* ignore */ }
          return null;
        })()}
      </TouchableOpacity>
    );
  }, [styles, theme, navigation, handleDelete, t, langLabels]);

  const renderEmpty = useCallback(() => (
    <View style={styles.emptyContainer}>
      <Icon name="history" size={48} color={theme.colors.text.disabled} />
      <Text style={styles.emptyText}>{t('interpretation.noRecords')}</Text>
    </View>
  ), [styles, theme, t]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('interpretation.recordsTitle')}</Text>
        {records.length > 0 ? (
          <TouchableOpacity style={styles.backButton} onPress={handleClearAll} activeOpacity={0.7}>
            <Icon name="delete-sweep" size={24} color={theme.colors.text.secondary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.backButton} />
        )}
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={styles.loadingText}>{t('interpretation.loading')}</Text>
        </View>
      ) : (
        <FlatList
          data={records}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={[
            styles.listContent,
            records.length === 0 && styles.listEmpty,
          ]}
          ListEmptyComponent={renderEmpty}
        />
      )}
      {AlertComponent}
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background.primary,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
    },
    backButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.primary,
    },

    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.sm,
    },
    loadingText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.tertiary,
    },

    listContent: {
      padding: theme.spacing.md,
    },
    listEmpty: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },

    card: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.spacing.borderRadius.base,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.sm,
      ...theme.spacing.shadows.sm,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.xs,
    },
    cardDate: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.secondary,
    },
    cardDuration: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.text.primary,
      fontVariant: ['tabular-nums'],
    },
    cardBody: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    langRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    langText: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.text.primary,
    },
    badges: {
      flexDirection: 'row',
      gap: theme.spacing.xs,
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      paddingHorizontal: theme.spacing.xs,
      paddingVertical: 2,
      borderRadius: theme.spacing.borderRadius.full,
      backgroundColor: theme.colors.background.secondary,
    },
    badgeText: {
      fontSize: theme.typography.fontSize.xxs,
      color: theme.colors.text.tertiary,
    },
    preview: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.tertiary,
      marginTop: theme.spacing.xs,
    },

    emptyContainer: {
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    emptyText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.disabled,
    },
  });
