import React, { useCallback, useRef, useEffect, useState, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Platform, Modal, Pressable } from 'react-native';
import Animated, { useAnimatedStyle, withRepeat, withTiming, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsHeadphonesConnected, isHeadphonesConnected as getHeadphonesConnected } from 'react-native-device-info';
import { AudioManager } from 'react-native-audio-api';
import { useNavigation } from '@react-navigation/native';
import { Theme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import Icon from '@/components/Icon';
import { useSimultaneousInterpretation, SubtitleSegment, InterpretationConfig } from '@/hooks/useSimultaneousInterpretation';
import { useCustomAlert } from '@/hooks/useCustomAlert';
import { useTranslationSettings } from '@/stores/AppStore';
import { INTERPRETATION_VOICES, INTERPRETATION_VOICE_CLONE } from '@/constants/interpretationVoices';
import { LanguageCode } from './constants';

interface InterpretationViewProps {
  theme: Theme;
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  onActiveChange?: (isActive: boolean) => void;
}

const LANGUAGE_MAP: Record<LanguageCode, string> = {
  'zh-CN': 'zh',
  'en-US': 'en',
};

export default function InterpretationView({
  theme,
  sourceLanguage,
  targetLanguage,
  onActiveChange,
}: InterpretationViewProps) {
  const { t } = useI18n();
  const { alert, AlertComponent } = useCustomAlert();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const styles = createStyles(theme, insets);
  const flatListRef = useRef<FlatList>(null);
  const { interpretationVoice, setInterpretationVoice } = useTranslationSettings();
  const [showVoiceSheet, setShowVoiceSheet] = useState(false);

  // 合法性校验后的显示值 + 显示文案
  const isValidVoice = !!interpretationVoice && INTERPRETATION_VOICES.some(v => v.id === interpretationVoice);
  const currentVoiceLabel = useMemo(() => {
    if (!isValidVoice) return t('interpretation.voice.clone');
    const found = INTERPRETATION_VOICES.find(v => v.id === interpretationVoice);
    return found ? t(found.nameKey) : t('interpretation.voice.clone');
  }, [isValidVoice, interpretationVoice, t]);

  // 输出模式
  const [outputMode, setOutputMode] = useState<'s2t' | 's2s'>('s2t');

  // 耳机检测（实时监听连接状态变化）
  const { loading: headphoneLoading, result: isHeadphonesConnected } = useIsHeadphonesConnected();

  const {
    isInitializing,
    isActive,
    isConnected,
    error,
    segments,
    durationShared,
    start,
    stop,
    clearSegments,
  } = useSimultaneousInterpretation();

  // 通知父组件同传活跃状态变化
  useEffect(() => {
    onActiveChange?.(isActive);
  }, [isActive, onActiveChange]);

  // 同传进行中耳机断开 → 直接停止会话。
  //   iOS: 用 react-native-audio-api 的 routeChange 事件（AVAudioSession.routeChangeNotification 封装），零延迟。
  //   Android: react-native-audio-api 未实现 routeChange；react-native-device-info 的 hook 对 A2DP 断开不可靠。
  //     退化为轮询 isHeadphonesConnected() async API（每次调用都实时查 AudioManager）。
  //     配合 stop() 立即切断 TTS 播放，轮询窗口内不会有回音。
  useEffect(() => {
    if (!isActive || outputMode !== 's2s') return;

    const handleDisconnected = () => {
      stop();
      alert(
        t('translation.headphoneDisconnectedTitle'),
        t('translation.headphoneDisconnectedMessage'),
      );
    };

    if (Platform.OS === 'ios') {
      const sub = AudioManager.addSystemEventListener('routeChange', (event) => {
        if (event.reason === 'OldDeviceUnavailable') {
          handleDisconnected();
        }
      });
      return () => sub.remove();
    }

    let cancelled = false;
    const interval = setInterval(async () => {
      try {
        const connected = await getHeadphonesConnected();
        if (cancelled) return;
        if (!connected) handleDisconnected();
      } catch { /* ignore */ }
    }, 500);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isActive, outputMode, stop, alert, t]);

  // 脉冲动画
  const pulseOpacity = useSharedValue(1);
  useEffect(() => {
    if (isActive) {
      pulseOpacity.value = withRepeat(withTiming(0.4, { duration: 800 }), -1, true);
    } else {
      pulseOpacity.value = 1;
    }
  }, [isActive]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  // 自动滚动
  useEffect(() => {
    if (segments.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [segments.length, segments[segments.length - 1]?.sourceText, segments[segments.length - 1]?.translatedText]);

  // 切换模式（带耳机检测守卫）
  const handleSelectMode = useCallback(async (mode: 's2t' | 's2s') => {
    if (isActive) return;
    if (mode === 's2s') {
      let connected = false;
      try { connected = await getHeadphonesConnected(); } catch { connected = !!isHeadphonesConnected; }
      if (!connected) {
        alert(
          t('translation.headphoneRequiredTitle'),
          t('translation.headphoneRequiredMessage'),
        );
        return;
      }
    }
    setOutputMode(mode);
  }, [isActive, isHeadphonesConnected, alert, t]);

  const handleToggle = useCallback(async () => {
    if (isActive) {
      stop();
      return;
    }
    // 开始前用 async API 实时查询耳机状态（hook 的 state 可能因 A2DP 监听不全而陈旧）
    if (outputMode === 's2s') {
      let connected = false;
      try { connected = await getHeadphonesConnected(); } catch { /* fallback to hook */ connected = !!isHeadphonesConnected; }
      if (!connected) {
        alert(
          t('translation.headphoneRequiredTitle'),
          t('translation.headphoneRequiredMessage'),
        );
        return;
      }
    }
    // 只传火山官方支持的 speaker_id，否则不传（降级为复刻用户声音）。
    const cfg: InterpretationConfig = {
      sourceLanguage: LANGUAGE_MAP[sourceLanguage],
      targetLanguage: LANGUAGE_MAP[targetLanguage],
      mode: outputMode,
      ...(outputMode === 's2s' && isValidVoice ? { speakerId: interpretationVoice } : {}),
    };
    start(cfg);
  }, [isActive, stop, start, sourceLanguage, targetLanguage, outputMode, interpretationVoice, isValidVoice, isHeadphonesConnected, alert, t]);

  const handleSelectVoice = useCallback((voiceId: string) => {
    setInterpretationVoice(voiceId);
    // 不关闭 Sheet：和翻译音色选择体验一致，用户可以继续切换对比，点"完成"或遮罩关闭
  }, [setInterpretationVoice]);

  const handleClear = useCallback(() => {
    if (!isActive) clearSegments();
  }, [isActive, clearSegments]);

  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const renderSubtitleItem = useCallback(({ item }: { item: SubtitleSegment }) => {
    const isCurrentlyActive = !item.isFinal;
    return (
      <View style={[styles.subtitleItem, isCurrentlyActive && styles.subtitleItemActive]}>
        {item.sourceText ? (
          <View style={styles.subtitleRow}>
            <View style={[styles.languageDot, { backgroundColor: theme.colors.text.secondary }]} />
            <Text style={[styles.sourceText, isCurrentlyActive && styles.sourceTextActive]}>
              {item.sourceText}
            </Text>
          </View>
        ) : null}
        {item.translatedText ? (
          <View style={styles.subtitleRow}>
            <View style={[styles.languageDot, { backgroundColor: theme.colors.primary }]} />
            <Text style={styles.translationText}>
              {item.translatedText}
            </Text>
          </View>
        ) : null}
      </View>
    );
  }, [styles, theme]);

  const renderEmptyState = useCallback(() => (
    <View style={styles.emptyContainer}>
      <Icon name="translate" size={48} color={theme.colors.text.tertiary} />
      <Text style={styles.emptyText}>{t('translation.interpretationHint')}</Text>
    </View>
  ), [styles, theme, t]);

  return (
    <View style={styles.container}>
      {/* 输出模式切换栏 */}
      <View style={styles.modeBar}>
        <TouchableOpacity
          style={styles.historyButton}
          onPress={() => navigation.navigate('InterpretationRecords')}
          activeOpacity={0.7}
        >
          <Icon name="history" size={18} color={theme.colors.text.secondary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeOption, outputMode === 's2t' && styles.modeOptionActive]}
          onPress={() => handleSelectMode('s2t')}
          disabled={isActive}
          activeOpacity={0.7}
        >
          <Icon
            name="subtitles"
            size={16}
            color={outputMode === 's2t' ? theme.colors.primary : theme.colors.text.tertiary}
          />
          <Text style={[styles.modeText, outputMode === 's2t' && styles.modeTextActive]}>
            {t('translation.modeTextOnly')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeOption, outputMode === 's2s' && styles.modeOptionActive]}
          onPress={() => handleSelectMode('s2s')}
          disabled={isActive}
          activeOpacity={0.7}
        >
          <Icon
            name="volume-up"
            size={16}
            color={outputMode === 's2s' ? theme.colors.primary : theme.colors.text.tertiary}
          />
          <Text style={[styles.modeText, outputMode === 's2s' && styles.modeTextActive]}>
            {t('translation.modeVoiceText')}
          </Text>
          {/* 未连接耳机时显示锁定图标 */}
          {!isHeadphonesConnected && !headphoneLoading && (
            <Icon name="headset" size={12} color={theme.colors.text.disabled} />
          )}
        </TouchableOpacity>
        {/* 同传音色入口：仅 s2s 且未激活时显示 */}
        {outputMode === 's2s' && !isActive && (
          <TouchableOpacity
            style={styles.voiceButton}
            onPress={() => setShowVoiceSheet(true)}
            activeOpacity={0.7}
          >
            <Icon name="record-voice-over" size={18} color={theme.colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* 字幕滚动区 */}
      <FlatList
        ref={flatListRef}
        data={segments}
        renderItem={renderSubtitleItem}
        keyExtractor={item => item.id}
        style={styles.subtitleList}
        contentContainerStyle={[
          styles.subtitleListContent,
          segments.length === 0 && styles.subtitleListEmpty,
        ]}
        ListEmptyComponent={renderEmptyState}
      />

      {/* 错误提示 */}
      {error ? (
        <View style={styles.errorBar}>
          <Icon name="error-outline" size={16} color={theme.colors.error} />
          <Text style={styles.errorText}>
            {error.startsWith('ERR_')
              ? t(`interpretation.error.${error}`, { defaultValue: t('interpretation.error.unknown') })
              : error}
          </Text>
        </View>
      ) : null}

      {/* 底部控制栏 */}
      <View style={styles.controlBar}>
        <View style={styles.controlLeft}>
          {isActive ? (
            <DurationDisplay durationShared={durationShared} formatDuration={formatDuration} styles={styles} />
          ) : segments.length > 0 ? (
            <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
              <Icon name="delete-outline" size={20} color={theme.colors.text.secondary} />
            </TouchableOpacity>
          ) : (
            <View style={styles.controlPlaceholder} />
          )}
        </View>

        <TouchableOpacity
          style={[styles.mainButton, isActive && styles.mainButtonActive]}
          onPress={handleToggle}
          disabled={isInitializing}
          activeOpacity={0.8}
        >
          {isActive ? (
            <Animated.View style={pulseStyle}>
              <Icon name="stop" size={28} color={theme.colors.text.inverse} />
            </Animated.View>
          ) : (
            <Icon name="mic" size={28} color={theme.colors.text.inverse} />
          )}
        </TouchableOpacity>

        <View style={styles.controlRight}>
          {isActive && (
            <View style={styles.statusIndicator}>
              <View style={[styles.statusDot, isConnected ? styles.statusDotConnected : styles.statusDotConnecting]} />
              <Text style={styles.statusText}>
                {isConnected ? t('translation.interpretationLive') : t('translation.interpretationConnecting')}
              </Text>
            </View>
          )}
        </View>
      </View>
      {/* 同传音色选择底部 Sheet */}
      <Modal
        visible={showVoiceSheet}
        transparent
        animationType="fade"
        onRequestClose={() => setShowVoiceSheet(false)}
        statusBarTranslucent
      >
        <Pressable style={styles.sheetOverlay} onPress={() => setShowVoiceSheet(false)}>
          <Pressable style={styles.sheetContainer} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>{t('interpretation.voiceTitle')}</Text>
            <Text style={styles.sheetHint}>{t('interpretation.voiceHint')}</Text>

            {/* 复刻我的声音 — 作为推荐项突出 */}
            <TouchableOpacity
              style={[styles.voiceCard, !isValidVoice && styles.voiceCardActive]}
              onPress={() => handleSelectVoice(INTERPRETATION_VOICE_CLONE)}
              activeOpacity={0.7}
            >
              <Icon
                name="graphic-eq"
                size={22}
                color={!isValidVoice ? theme.colors.primary : theme.colors.text.secondary}
              />
              <View style={styles.voiceCardBody}>
                <Text style={[styles.voiceCardTitle, !isValidVoice && styles.voiceCardTitleActive]}>
                  {t('interpretation.voice.clone')}
                </Text>
                <Text style={styles.voiceCardDesc}>{t('interpretation.voice.cloneDesc')}</Text>
              </View>
              {!isValidVoice && (
                <Icon name="check-circle" size={20} color={theme.colors.primary} />
              )}
            </TouchableOpacity>

            <Text style={styles.sheetGroupTitle}>{t('interpretation.voice.presetTitle')}</Text>
            <View style={styles.voicePillGroup}>
              {INTERPRETATION_VOICES.map((voice) => {
                const selected = interpretationVoice === voice.id;
                return (
                  <TouchableOpacity
                    key={voice.id}
                    style={[styles.voicePill, selected && styles.voicePillActive]}
                    onPress={() => handleSelectVoice(voice.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.voicePillText, selected && styles.voicePillTextActive]}>
                      {t(voice.nameKey)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={styles.sheetDone}
              onPress={() => setShowVoiceSheet(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.sheetDoneText}>{t('translation.done')}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {AlertComponent}
    </View>
  );
}

function DurationDisplay({
  durationShared,
  formatDuration,
  styles,
}: {
  durationShared: any;
  formatDuration: (ms: number) => string;
  styles: any;
}) {
  const [display, setDisplay] = React.useState('00:00');

  useEffect(() => {
    const interval = setInterval(() => {
      setDisplay(formatDuration(durationShared.value));
    }, 200);
    return () => clearInterval(interval);
  }, [durationShared, formatDuration]);

  return <Text style={styles.durationText}>{display}</Text>;
}

const createStyles = (theme: Theme, insets: { bottom: number }) =>
  StyleSheet.create({
    container: { flex: 1 },

    modeBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      gap: theme.spacing.sm,
    },
    historyButton: {
      padding: theme.spacing.xs,
      marginRight: theme.spacing.xxs,
    },
    voiceButton: {
      padding: theme.spacing.xs,
      marginLeft: theme.spacing.xxs,
    },
    modeOption: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xxs,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.spacing.borderRadius.full,
      borderWidth: 1,
      borderColor: theme.colors.border.light,
    },
    modeOptionActive: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primary + '10',
    },
    modeText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.text.tertiary,
    },
    modeTextActive: {
      color: theme.colors.primary,
      fontWeight: theme.typography.fontWeight.medium,
    },

    subtitleList: { flex: 1 },
    subtitleListContent: { padding: theme.spacing.md },
    subtitleListEmpty: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    subtitleItem: {
      marginBottom: theme.spacing.md,
      padding: theme.spacing.sm,
      borderRadius: theme.spacing.borderRadius.sm,
    },
    subtitleItemActive: { backgroundColor: theme.colors.background.secondary },
    subtitleRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: theme.spacing.xs,
    },
    languageDot: {
      width: 6, height: 6, borderRadius: 3,
      marginTop: 7, marginRight: theme.spacing.sm,
    },
    sourceText: {
      flex: 1, fontSize: theme.typography.fontSize.base,
      color: theme.colors.text.primary, lineHeight: 22,
    },
    sourceTextActive: { fontWeight: theme.typography.fontWeight.medium },
    translationText: {
      flex: 1, fontSize: theme.typography.fontSize.base,
      color: theme.colors.primary, lineHeight: 22,
    },

    emptyContainer: { alignItems: 'center', justifyContent: 'center', gap: theme.spacing.md },
    emptyText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.tertiary, textAlign: 'center',
    },

    errorBar: {
      flexDirection: 'row', alignItems: 'center',
      padding: theme.spacing.sm, marginHorizontal: theme.spacing.md,
      backgroundColor: theme.colors.background.secondary,
      borderRadius: theme.spacing.borderRadius.sm, gap: theme.spacing.xs,
    },
    errorText: { fontSize: theme.typography.fontSize.xs, color: theme.colors.error, flex: 1 },

    controlBar: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.md,
      paddingBottom: Math.max(insets.bottom, theme.spacing.md),
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border.light,
    },
    controlLeft: { width: 80, alignItems: 'flex-start' },
    controlRight: { width: 80, alignItems: 'flex-end' },
    controlPlaceholder: { width: 80 },

    mainButton: {
      width: 64, height: 64, borderRadius: 32,
      backgroundColor: theme.colors.primary,
      alignItems: 'center', justifyContent: 'center',
      ...theme.spacing.shadows.sm,
    },
    mainButtonActive: { backgroundColor: theme.colors.error },

    durationText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.text.secondary, fontVariant: ['tabular-nums'],
    },
    clearButton: { padding: theme.spacing.xs },

    statusIndicator: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xxs },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusDotConnected: { backgroundColor: theme.colors.success },
    statusDotConnecting: { backgroundColor: theme.colors.warning },
    statusText: { fontSize: theme.typography.fontSize.xxs, color: theme.colors.text.tertiary },

    // 底部音色选择 Sheet
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
      paddingBottom: Math.max(insets.bottom, theme.spacing.md),
    },
    sheetTitle: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.primary,
      textAlign: 'center',
    },
    sheetHint: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.text.tertiary,
      textAlign: 'center',
      marginTop: theme.spacing.xxs,
      marginBottom: theme.spacing.md,
    },
    sheetGroupTitle: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.text.tertiary,
      marginTop: theme.spacing.md,
      marginBottom: theme.spacing.xs,
      paddingHorizontal: theme.spacing.xxs,
    },

    // 复刻推荐卡
    voiceCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.spacing.borderRadius.base,
      borderWidth: 1,
      borderColor: theme.colors.border.light,
      backgroundColor: theme.colors.background.primary,
    },
    voiceCardActive: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primary + '10',
    },
    voiceCardBody: {
      flex: 1,
    },
    voiceCardTitle: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.text.primary,
    },
    voiceCardTitleActive: {
      color: theme.colors.primary,
    },
    voiceCardDesc: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.text.tertiary,
      marginTop: 2,
    },

    // 预设音色胶囊（横向流式布局）
    voicePillGroup: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.xs,
    },
    voicePill: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.spacing.borderRadius.full,
      borderWidth: 1,
      borderColor: theme.colors.border.light,
      backgroundColor: theme.colors.background.primary,
    },
    voicePillActive: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primary + '15',
    },
    voicePillText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.secondary,
    },
    voicePillTextActive: {
      color: theme.colors.primary,
      fontWeight: theme.typography.fontWeight.medium,
    },

    sheetDone: {
      marginTop: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      alignItems: 'center',
      backgroundColor: theme.colors.primary,
      borderRadius: theme.spacing.borderRadius.sm,
    },
    sheetDoneText: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.inverse,
    },
  });
