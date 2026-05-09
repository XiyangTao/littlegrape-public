/**
 * WordCard 样式定义
 */

import { StyleSheet } from 'react-native';
import { Theme } from '@/context/ThemeProvider';

// 粒子常量
export const PARTICLE_COUNT = 30;
export const ANIMATION_DURATION = 2000;
export const STAR_CHARS = ['★', '☆', '✦', '✧', '✯', '✶'];

// 粒子类型
export interface Particle {
  id: number;
  star: string;
  startX: number;
  endY: number;
  driftX: number;
  midDriftX: number;
  delay: number;
  size: number;
  rotation: number;
  rotationSpeed: number;
  baseOpacity: number;
  colorVariant: number;
}

export const generateParticles = (screenWidth: number): Particle[] => {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
    const wave = i < PARTICLE_COUNT * 0.4 ? 0 : i < PARTICLE_COUNT * 0.75 ? 1 : 2;
    const star = STAR_CHARS[Math.floor(Math.random() * STAR_CHARS.length)];
    const size = 12 + Math.random() * 16;

    return {
      id: i,
      star,
      startX: (Math.random() - 0.5) * screenWidth * (0.6 + Math.random() * 0.4),
      endY: -(220 + Math.random() * 380),
      driftX: (Math.random() - 0.5) * 180,
      midDriftX: (Math.random() - 0.5) * 70,
      delay: wave === 0 ? Math.random() * 80 : wave === 1 ? 60 + Math.random() * 140 : 160 + Math.random() * 280,
      size,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 540,
      baseOpacity: 0.6 + Math.random() * 0.4,
      colorVariant: Math.floor(Math.random() * 3),
    };
  });
};

export const createStyles = (theme: Theme, cardHeight: number) =>
  StyleSheet.create({
    cardContainer: {
      height: cardHeight,
      backgroundColor: theme.colors.background.primary,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 24,
    },
    closeButton: {
      position: 'absolute',
      top: 12,
      left: 20,
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.colors.background.secondary,
      zIndex: 10,
    },
    closeButtonTouchable: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    favoriteButton: {
      position: 'absolute',
      top: 12,
      left: 72,
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.colors.background.secondary,
      zIndex: 10,
    },
    favoriteButtonTouchable: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    statusBadge: {
      position: 'absolute',
      top: 20,
      right: 20,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: theme.spacing.borderRadius.base,
    },
    statusText: {
      fontSize: 12,
      fontWeight: '600',
    },
    cardFace: {
      position: 'absolute',
      top: theme.scale(56),
      left: 0,
      right: 0,
      bottom: theme.scale(190),
      backfaceVisibility: 'hidden',
    },
    frontFace: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    backFace: {
      flexDirection: 'column',
      justifyContent: 'flex-start',
      alignItems: 'stretch',
      paddingTop: 10,
      paddingHorizontal: 16,
    },
    flipTouchArea: {
      flex: 1,
      width: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    wordText: {
      fontSize: theme.fontScale(40),
      fontWeight: '700',
      color: theme.colors.text.primary,
      letterSpacing: -1,
      textAlign: 'center',
      paddingHorizontal: theme.spacing.md,
    },
    phoneticRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
      gap: 16,
    },
    phoneticItem: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    phoneticLabel: {
      fontSize: 12,
      color: theme.colors.primary,
      fontWeight: '600',
      marginRight: 4,
    },
    phoneticText: {
      fontSize: 16,
      color: theme.colors.text.secondary,
      fontStyle: 'italic',
    },
    playButton: {
      width: theme.scale(72),
      height: theme.scale(72),
      borderRadius: theme.scale(36),
      backgroundColor: theme.colors.primary + '15',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: theme.scale(24),
    },
    playButtonActive: {
      backgroundColor: theme.colors.primary,
    },
    meaningSection: {
      width: '100%',
      marginTop: 32,
      alignItems: 'center',
      paddingHorizontal: 24,
      gap: 8,
    },
    meaningCnText: {
      fontSize: theme.fontScale(20),
      color: theme.colors.text.primary,
      fontWeight: '500',
      textAlign: 'center',
      lineHeight: theme.fontScale(28),
    },
    meaningEnText: {
      fontSize: theme.fontScale(17),
      color: theme.colors.text.secondary,
      textAlign: 'center',
      lineHeight: theme.fontScale(24),
    },
    tagsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      marginTop: 16,
      gap: 8,
    },
    tagItem: {
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: theme.spacing.borderRadius.base,
    },
    tagText: {
      fontSize: 12,
      fontWeight: '500',
    },
    flipHint: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 24,
      gap: 4,
    },
    flipHintText: {
      fontSize: 13,
      color: theme.colors.text.disabled,
    },
    // 反面样式
    backScrollView: {
      flex: 1,
    },
    backScrollContent: {
      paddingHorizontal: 8,
      paddingBottom: 60,
    },
    backHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 4,
      marginBottom: 20,
    },
    backHeaderButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.colors.background.secondary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    backHeaderButtonActive: {
      backgroundColor: theme.colors.primary,
    },
    backWordText: {
      fontSize: theme.fontScale(28),
      fontWeight: '700',
      color: theme.colors.text.primary,
      textAlign: 'center',
      flex: 1,
    },
    backSection: {
      marginBottom: 20,
    },
    backSectionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.primary,
      marginBottom: 10,
    },
    etymologyContainer: {
      backgroundColor: theme.colors.background.secondary,
      borderRadius: theme.spacing.borderRadius.base,
      padding: 12,
      gap: 8,
    },
    etymologyItem: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    etymologyLabel: {
      fontSize: 12,
      color: theme.colors.text.secondary,
      width: 40,
    },
    etymologyText: {
      fontSize: 14,
      color: theme.colors.text.primary,
      flex: 1,
    },
    analysisText: {
      fontSize: 13,
      color: theme.colors.text.secondary,
      marginTop: 4,
      lineHeight: 20,
    },
    meaningItemBack: {
      backgroundColor: theme.colors.background.secondary,
      borderRadius: theme.spacing.borderRadius.base,
      padding: 12,
      marginBottom: 10,
    },
    meaningHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    posTextBack: {
      fontSize: 13,
      color: theme.colors.primary,
      fontWeight: '600',
      marginRight: 8,
    },
    meaningCnBack: {
      fontSize: 15,
      color: theme.colors.text.primary,
      flex: 1,
      lineHeight: 22,
    },
    meaningEnBack: {
      fontSize: 13,
      color: theme.colors.text.secondary,
      marginTop: 4,
      lineHeight: 20,
    },
    exampleBack: {
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border.light,
    },
    exampleEnBack: {
      fontSize: 13,
      color: theme.colors.text.primary,
      fontStyle: 'italic',
      lineHeight: 20,
    },
    exampleCnBack: {
      fontSize: 12,
      color: theme.colors.text.secondary,
      marginTop: 4,
      lineHeight: 18,
    },
    collocationItem: {
      backgroundColor: theme.colors.background.secondary,
      borderRadius: theme.spacing.borderRadius.sm,
      padding: 10,
      marginBottom: 8,
    },
    collocationPattern: {
      fontSize: 14,
      color: theme.colors.text.primary,
      fontWeight: '500',
    },
    collocationMeaning: {
      fontSize: 13,
      color: theme.colors.text.secondary,
      marginTop: 4,
    },
    aiErrorText: {
      fontSize: 13,
      color: theme.colors.error,
      textAlign: 'center',
      marginBottom: 10,
    },
    // 底部操作区
    bottomArea: {
      position: 'absolute',
      bottom: theme.scale(60),
      width: '100%',
      alignItems: 'center',
    },
    actionButtonsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      gap: 12,
      marginBottom: 16,
    },
    knownButtonOuter: {
      flex: 1,
    },
    knownButton: {
      backgroundColor: 'transparent',
      borderRadius: theme.spacing.borderRadius.xl,
      borderWidth: 1,
      borderColor: theme.colors.primary + '40',
    },
    knownButtonTouchable: {
      paddingVertical: 14,
      width: '100%',
    },
    knownButtonInner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },
    knownButtonIconWrapper: {
      width: 18,
      height: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    knownButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.primary,
    },
    practiceButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primary,
      paddingVertical: 14,
      borderRadius: theme.spacing.borderRadius.xl,
      gap: 10,
    },
    practiceButtonDisabled: {
      opacity: 0.5,
    },
    practiceButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.text.inverse,
    },
    knownHintText: {
      fontSize: 12,
      color: theme.colors.text.disabled,
      textAlign: 'center',
      marginBottom: 8,
    },
    swipeHint: {
      alignItems: 'center',
    },
    swipeHintText: {
      fontSize: 13,
      color: theme.colors.text.disabled,
    },
    // 粒子
    particleContainer: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: theme.scale(650),
      alignItems: 'center',
      justifyContent: 'flex-end',
      zIndex: 100,
    },
    particle: {
      position: 'absolute',
      bottom: 0,
    },
  });
