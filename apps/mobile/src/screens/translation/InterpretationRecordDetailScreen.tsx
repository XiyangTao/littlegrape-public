import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Share, Modal, Pressable } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import { useTheme, Theme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import { useAuthStore } from '@/stores/AuthStore';
import { useCustomAlert } from '@/hooks/useCustomAlert';
import Icon from '@/components/Icon';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import {
  getRecordById,
  generateExportText,
  generateExportTextFile,
  removeInterpretationRecord,
} from '@/services/InterpretationRecordService';
import type { InterpretationRecordRow } from '@/db/InterpretationRecordDB';
import type { SubtitleSegment } from '@/hooks/useSimultaneousInterpretation';

type RouteParams = { InterpretationRecordDetail: { recordId: string } };

export default function InterpretationRecordDetailScreen() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'InterpretationRecordDetail'>>();
  const userId = useAuthStore(s => s.user?.id);
  const { confirm, AlertComponent } = useCustomAlert();
  const insets = useSafeAreaInsets();
  const styles = createStyles(theme, insets.bottom);

  const [record, setRecord] = useState<InterpretationRecordRow | null>(null);
  const [segments, setSegments] = useState<SubtitleSegment[]>([]);
  const [copied, setCopied] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const sourcePlayer = useAudioPlayer();
  const translationPlayer = useAudioPlayer();

  // 导出用的 i18n 文案（Service 层纯函数，由 Screen 注入翻译文本）
  const exportTexts = useMemo(() => ({
    header: t('interpretation.exportHeader'),
    duration: t('interpretation.exportDuration'),
    direction: t('interpretation.exportDirection'),
    langNames: {
      zh: t('interpretation.langZh'),
      en: t('interpretation.langEn'),
      zhen: t('interpretation.langZhEn'),
    },
  }), [t]);

  const langLabels = useMemo<Record<string, string>>(() => ({
    zh: t('interpretation.langZh'),
    en: t('interpretation.langEn'),
    zhen: t('interpretation.langZhEn'),
  }), [t]);

  const loadRecord = useCallback(async () => {
    if (!userId) return;
    const data = await getRecordById(userId, route.params.recordId);
    if (data) {
      setRecord(data);
      try {
        setSegments(JSON.parse(data.transcript));
      } catch { /* ignore */ }
    }
  }, [userId, route.params.recordId]);

  useEffect(() => {
    loadRecord();
  }, [loadRecord]);

  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  // ===== 操作 =====

  const handleCopyText = useCallback(async () => {
    if (!record) return;
    const text = generateExportText(record, exportTexts);
    await Clipboard.setStringAsync(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [record, exportTexts]);

  const handleShareText = useCallback(async () => {
    if (!record) return;
    const text = generateExportText(record, exportTexts);
    await Share.share({ message: text });
  }, [record, exportTexts]);

  const handleShareTextFile = useCallback(async () => {
    if (!record) return;
    const fileUri = generateExportTextFile(record, exportTexts);
    await Sharing.shareAsync(fileUri, { mimeType: 'text/plain' });
  }, [record, exportTexts]);

  const handleShareSourceAudio = useCallback(async () => {
    if (!record?.sourceAudioPath) return;
    await Sharing.shareAsync(record.sourceAudioPath, { mimeType: 'audio/wav' });
  }, [record]);

  const handleShareTranslationAudio = useCallback(async () => {
    if (!record?.translationAudioPath) return;
    await Sharing.shareAsync(record.translationAudioPath, { mimeType: 'audio/wav' });
  }, [record]);

  // 导出菜单选项（按顺序展示）— 复制功能已在底部「复制文本」按钮，这里不重复提供
  const exportOptions = useMemo(() => {
    if (!record) return [];
    const base = [
      { icon: 'ios-share', label: t('interpretation.exportShareText'), onPress: handleShareText },
      { icon: 'description', label: t('interpretation.exportTextFile'), onPress: handleShareTextFile },
    ];
    if (record.sourceAudioPath) {
      base.push({ icon: 'mic', label: t('interpretation.exportSourceAudio'), onPress: handleShareSourceAudio });
    }
    if (record.translationAudioPath) {
      base.push({ icon: 'volume-up', label: t('interpretation.exportTranslationAudio'), onPress: handleShareTranslationAudio });
    }
    return base;
  }, [record, t, handleShareText, handleShareTextFile, handleShareSourceAudio, handleShareTranslationAudio]);

  const handleSelectExport = useCallback(async (onPress: () => void | Promise<void>) => {
    setShowExportMenu(false);
    // 等关闭动画，避免 Share 弹窗抢焦点
    setTimeout(() => { onPress(); }, 150);
  }, []);

  const handleDelete = useCallback(() => {
    if (!record || !userId) return;
    confirm(
      t('interpretation.deleteTitle'),
      t('interpretation.deleteMessage'),
      async () => {
        await removeInterpretationRecord(userId, record.id);
        navigation.goBack();
      },
      undefined,
      'error',
    );
  }, [record, userId, t, navigation, confirm]);

  const handlePlaySource = useCallback(async () => {
    if (!record?.sourceAudioPath) return;
    if (sourcePlayer.isPlaying) {
      await sourcePlayer.stop();
    } else {
      await translationPlayer.stop();
      await sourcePlayer.play(record.sourceAudioPath);
    }
  }, [record, sourcePlayer, translationPlayer]);

  const handlePlayTranslation = useCallback(async () => {
    if (!record?.translationAudioPath) return;
    if (translationPlayer.isPlaying) {
      await translationPlayer.stop();
    } else {
      await sourcePlayer.stop();
      await translationPlayer.play(record.translationAudioPath);
    }
  }, [record, sourcePlayer, translationPlayer]);

  if (!record) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const sourceLang = langLabels[record.sourceLanguage] || record.sourceLanguage;
  const targetLang = langLabels[record.targetLanguage] || record.targetLanguage;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('interpretation.recordDetail')}</Text>
        <TouchableOpacity style={styles.headerButton} onPress={handleDelete}>
          <Icon name="delete-outline" size={24} color={theme.colors.text.secondary} />
        </TouchableOpacity>
      </View>

      {/* 元信息 */}
      <View style={styles.metaBar}>
        <Text style={styles.metaText}>{formatDate(record.createdAt)}</Text>
        <Text style={styles.metaDot}>·</Text>
        <Text style={styles.metaText}>{sourceLang} → {targetLang}</Text>
        <Text style={styles.metaDot}>·</Text>
        <Text style={styles.metaText}>{formatDuration(record.durationMs)}</Text>
      </View>

      {/* 字幕区 */}
      <ScrollView style={styles.transcriptScroll} contentContainerStyle={styles.transcriptContent}>
        {segments.map((seg) => (
          <View key={seg.id} style={styles.segmentItem}>
            {seg.sourceText ? (
              <View style={styles.segmentRow}>
                <View style={[styles.dot, { backgroundColor: theme.colors.text.secondary }]} />
                <Text style={styles.sourceText}>{seg.sourceText}</Text>
              </View>
            ) : null}
            {seg.translatedText ? (
              <View style={styles.segmentRow}>
                <View style={[styles.dot, { backgroundColor: theme.colors.primary }]} />
                <Text style={styles.translationText}>{seg.translatedText}</Text>
              </View>
            ) : null}
          </View>
        ))}
      </ScrollView>

      {/* 音频播放区 */}
      {(record.sourceAudioPath || record.translationAudioPath) && (
        <View style={styles.audioSection}>
          {record.sourceAudioPath && (
            <TouchableOpacity style={styles.audioRow} onPress={handlePlaySource} activeOpacity={0.7}>
              <Icon name="mic" size={20} color={theme.colors.text.secondary} />
              <Text style={styles.audioLabel}>{t('interpretation.sourceRecording')}</Text>
              <View style={{ flex: 1 }} />
              <Icon
                name={sourcePlayer.isPlaying ? 'pause' : 'play-arrow'}
                size={24}
                color={theme.colors.primary}
              />
            </TouchableOpacity>
          )}
          {record.translationAudioPath && (
            <TouchableOpacity style={styles.audioRow} onPress={handlePlayTranslation} activeOpacity={0.7}>
              <Icon name="volume-up" size={20} color={theme.colors.text.secondary} />
              <Text style={styles.audioLabel}>{t('interpretation.translationRecording')}</Text>
              <View style={{ flex: 1 }} />
              <Icon
                name={translationPlayer.isPlaying ? 'pause' : 'play-arrow'}
                size={24}
                color={theme.colors.primary}
              />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* 底部操作栏 */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.bottomButton} onPress={handleCopyText} activeOpacity={0.7}>
          <Icon name={copied ? 'check' : 'content-copy'} size={20} color={theme.colors.primary} />
          <Text style={styles.bottomButtonText}>
            {copied ? t('translation.copied') : t('interpretation.copyText')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.bottomButton, styles.bottomButtonPrimary]} onPress={() => setShowExportMenu(true)} activeOpacity={0.7}>
          <Icon name="share" size={20} color={theme.colors.text.inverse} />
          <Text style={[styles.bottomButtonText, styles.bottomButtonTextPrimary]}>
            {t('interpretation.export')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 导出选项底部菜单 */}
      <Modal
        visible={showExportMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExportMenu(false)}
        statusBarTranslucent
      >
        <Pressable style={styles.sheetOverlay} onPress={() => setShowExportMenu(false)}>
          <Pressable style={styles.sheetContainer} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>{t('interpretation.exportTitle')}</Text>
            {exportOptions.map((opt) => (
              <TouchableOpacity
                key={opt.label}
                style={styles.sheetOption}
                onPress={() => handleSelectExport(opt.onPress)}
                activeOpacity={0.6}
              >
                <Icon name={opt.icon} size={20} color={theme.colors.primary} />
                <Text style={styles.sheetOptionText}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.sheetCancel}
              onPress={() => setShowExportMenu(false)}
              activeOpacity={0.6}
            >
              <Text style={styles.sheetCancelText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {AlertComponent}
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme, bottomInset: number) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background.primary,
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.tertiary,
    },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
    },
    headerButton: {
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

    metaBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.xs,
      gap: theme.spacing.xs,
    },
    metaText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.text.tertiary,
    },
    metaDot: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.text.disabled,
    },

    transcriptScroll: {
      flex: 1,
    },
    transcriptContent: {
      padding: theme.spacing.md,
    },
    segmentItem: {
      marginBottom: theme.spacing.md,
    },
    segmentRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: theme.spacing.xxs,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      marginTop: 7,
      marginRight: theme.spacing.sm,
    },
    sourceText: {
      flex: 1,
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text.primary,
      lineHeight: 22,
    },
    translationText: {
      flex: 1,
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.primary,
      lineHeight: 22,
    },

    audioSection: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border.light,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    audioRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
    },
    audioLabel: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.primary,
    },

    bottomBar: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border.light,
    },
    bottomButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.xs,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.spacing.borderRadius.sm,
      borderWidth: 1,
      borderColor: theme.colors.primary,
    },
    bottomButtonPrimary: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    bottomButtonText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.primary,
    },
    bottomButtonTextPrimary: {
      color: theme.colors.text.inverse,
    },

    // 底部导出菜单
    sheetOverlay: {
      flex: 1,
      backgroundColor: theme.colors.overlay,
      justifyContent: 'flex-end',
    },
    sheetContainer: {
      backgroundColor: theme.colors.card,
      borderTopLeftRadius: theme.spacing.borderRadius.lg,
      borderTopRightRadius: theme.spacing.borderRadius.lg,
      paddingTop: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      paddingBottom: Math.max(bottomInset, theme.spacing.md),
    },
    sheetTitle: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.tertiary,
      textAlign: 'center',
      marginBottom: theme.spacing.sm,
    },
    sheetOption: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border.light,
    },
    sheetOptionText: {
      flex: 1,
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text.primary,
    },
    sheetCancel: {
      marginTop: theme.spacing.sm,
      paddingVertical: theme.spacing.md,
      alignItems: 'center',
      backgroundColor: theme.colors.background.secondary,
      borderRadius: theme.spacing.borderRadius.sm,
    },
    sheetCancelText: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.text.secondary,
    },
  });
