/**
 * 长按句子后弹出的气泡按钮组
 *
 * 位置：贴屏幕右边缘（right: 16），垂直对齐长按触发点（anchorY）
 * 图标内容由调用方根据状态机传入（未播放 / 播放中 / 暂停中 等场景不同）
 * 手松开保留显示，点图标或点外部区域消失
 */
import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@react-native-vector-icons/material-icons';
import { useTheme, type Theme } from '@/context/ThemeProvider';
import { CLASSICS } from '@/constants/classicsTheme';
import { PremiumBadge } from '@/components/PremiumBadge';

export type BubbleIconKey = 'play-en' | 'play-ai' | 'shadow' | 'pause' | 'resume' | 'stop';

export interface BubbleIconConfig {
  key: BubbleIconKey;
  iconName: string;            // MaterialIcons name
  label: string;                // 短标签（辅助显示）
  loading?: boolean;
  /** 锁定态（Free 用户）：icon/label 半透明 + 右上角会员徽章，点击由调用方引导升级 */
  locked?: boolean;
  onPress: () => void;
}

interface Props {
  visible: boolean;
  anchorY: number;              // 长按点 pageY
  icons: BubbleIconConfig[];
  onDismiss: () => void;
}

const BUBBLE_HEIGHT = 44;
const BUBBLE_RIGHT_INSET = 12;

export default function SentenceBubble({ visible, anchorY, icons, onDismiss }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  if (!visible) return null;

  // 气泡垂直中心对齐 anchorY，但不允许超出屏幕上下边界（粗略）
  const top = Math.max(anchorY - BUBBLE_HEIGHT / 2, 60);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Pressable
          style={[styles.bubble, { top, right: BUBBLE_RIGHT_INSET }]}
          onPress={() => { /* 吞掉 bubble 内点击，避免冒泡到 backdrop */ }}
        >
          {icons.map((icon) => (
            <TouchableOpacity
              key={icon.key}
              style={styles.iconBtn}
              activeOpacity={0.7}
              onPress={icon.onPress}
              hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
            >
              {icon.loading ? (
                <ActivityIndicator size="small" color={CLASSICS.colors.accent} />
              ) : (
                <MaterialIcons
                  name={icon.iconName as any}
                  size={22}
                  color={CLASSICS.colors.ink}
                  style={icon.locked && styles.iconDimmed}
                />
              )}
              {!icon.loading && (
                <Text
                  style={[styles.iconLabel, icon.locked && styles.iconDimmed]}
                  numberOfLines={1}
                >
                  {icon.label}
                </Text>
              )}
              {icon.locked && (
                <View style={styles.lockBadge} pointerEvents="none">
                  <PremiumBadge level="basic" size="xs" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'transparent', // 透明，但占满屏幕以捕获点击 dismiss
    },
    bubble: {
      position: 'absolute',
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: CLASSICS.colors.paper,
      borderRadius: theme.spacing.borderRadius.sm,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: CLASSICS.colors.divider,
      paddingHorizontal: theme.spacing.xs,
      paddingVertical: theme.spacing.xxs,
      gap: theme.spacing.xs,
      minHeight: BUBBLE_HEIGHT,
      ...theme.spacing.shadows.sm,
    },
    iconBtn: {
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.xs,
      paddingVertical: theme.spacing.xxs,
      minWidth: 44,
    },
    iconLabel: {
      fontSize: theme.typography.fontSize.xxs,
      color: CLASSICS.colors.inkMuted,
      marginTop: 1,
    },
    iconDimmed: {
      opacity: 0.5,
    },
    lockBadge: {
      position: 'absolute',
      top: -2,
      right: -4,
    },
  });
