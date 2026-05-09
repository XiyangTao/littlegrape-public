/**
 * 名著阅读页底部 Mini Player
 *
 * 仅在有轨道在播（track != null）时挂载，替代底部章级导航。
 * 结构：
 *   顶部状态行：[轨道图标] 朗读中/讲解中 · 第 N 段 · 第 i/M 句    ✕
 *   控件行：    ⏮   [▶/⏸ / loading]   ⏭     单行预览文本（省略）
 */
import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { MaterialIcons } from '@react-native-vector-icons/material-icons';
import { useTheme, type Theme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import { CLASSICS } from '@/constants/classicsTheme';

interface Props {
  track: 'en' | 'ai';
  paraIdx: number;
  sentIdx: number;
  sentCountInPara: number;
  previewText: string;
  isLoading: boolean;
  isPlaying: boolean;
  isPaused: boolean;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToggle: () => void;
  onStop: () => void;
}

export default function MiniPlayer({
  track,
  paraIdx,
  sentIdx,
  sentCountInPara,
  previewText,
  isLoading,
  isPlaying,
  isPaused,
  canPrev,
  canNext,
  onPrev,
  onNext,
  onToggle,
  onStop,
}: Props) {
  const { theme } = useTheme();
  const { effectiveLanguage } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const isZh = effectiveLanguage === 'zh-CN';

  const trackIcon = track === 'en' ? 'volume-up' : 'auto-awesome';
  const trackLabel = track === 'en'
    ? (isZh ? '朗读中' : 'Reading')
    : (isZh ? '讲解中' : 'Explaining');
  const positionText = isZh
    ? `第 ${paraIdx + 1} 段 · 第 ${sentIdx + 1}/${sentCountInPara} 句`
    : `Para ${paraIdx + 1} · Sent ${sentIdx + 1}/${sentCountInPara}`;

  const playPauseIcon = isPaused ? 'play-arrow' : 'pause';

  return (
    <View style={styles.container}>
      {/* 顶部状态行 */}
      <View style={styles.statusRow}>
        <MaterialIcons name={trackIcon as any} size={16} color={CLASSICS.colors.accent} />
        <Text style={styles.statusLabel} numberOfLines={1}>
          {trackLabel} · {positionText}
        </Text>
        <TouchableOpacity
          onPress={onStop}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.6}
        >
          <MaterialIcons name="close" size={20} color={CLASSICS.colors.inkMuted} />
        </TouchableOpacity>
      </View>

      {/* 控件行 */}
      <View style={styles.controlsRow}>
        <TouchableOpacity
          onPress={onPrev}
          disabled={!canPrev}
          style={[styles.ctrlBtn, !canPrev && styles.ctrlBtnDisabled]}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          activeOpacity={0.6}
        >
          <MaterialIcons
            name="skip-previous"
            size={28}
            color={canPrev ? CLASSICS.colors.ink : CLASSICS.colors.inkFaint}
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onToggle}
          disabled={isLoading}
          style={styles.playBtn}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          activeOpacity={0.6}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={CLASSICS.colors.accent} />
          ) : (
            <MaterialIcons name={playPauseIcon as any} size={32} color={CLASSICS.colors.accent} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onNext}
          disabled={!canNext}
          style={[styles.ctrlBtn, !canNext && styles.ctrlBtnDisabled]}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          activeOpacity={0.6}
        >
          <MaterialIcons
            name="skip-next"
            size={28}
            color={canNext ? CLASSICS.colors.ink : CLASSICS.colors.inkFaint}
          />
        </TouchableOpacity>

        <Text style={styles.preview} numberOfLines={1} ellipsizeMode="tail">
          {previewText}
        </Text>
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.xs,
      paddingBottom: theme.spacing.xs,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: CLASSICS.colors.divider,
      backgroundColor: CLASSICS.colors.paper,
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      paddingVertical: 2,
    },
    statusLabel: {
      flex: 1,
      fontSize: theme.typography.fontSize.xs,
      color: CLASSICS.colors.inkMuted,
      fontFamily: CLASSICS.fontFamily.serif,
    },
    controlsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    ctrlBtn: {
      padding: theme.spacing.xxs,
    },
    ctrlBtnDisabled: {
      opacity: 0.4,
    },
    playBtn: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    preview: {
      flex: 1,
      fontSize: theme.typography.fontSize.xs,
      color: CLASSICS.colors.inkFaint,
      fontFamily: CLASSICS.fontFamily.serif,
      marginLeft: theme.spacing.xs,
    },
  });
