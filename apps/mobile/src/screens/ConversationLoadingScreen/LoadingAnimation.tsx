import React from 'react';
import { View, Text, Animated } from 'react-native';
import Icon, { IconNames } from '@/components/Icon';
import { Theme } from '@/context/ThemeProvider';
import type { ConversationConfig } from '@/types/conversation';

// Loading消息配置
export const loadingMessageKeys = [
  { key: 'settingUpScene', emoji: '🎬', icon: IconNames.camera },
  { key: 'trainingActor', emoji: '🎭', icon: IconNames.psychology },
  { key: 'readingScript', emoji: '📚', icon: IconNames.book },
  { key: 'adjustingLights', emoji: '🎨', icon: IconNames.lightbulb },
  { key: 'buildingStage', emoji: '🎪', icon: IconNames.school },
  { key: 'tuningSpeakers', emoji: '🎵', icon: IconNames.volume },
  { key: 'applyingMakeup', emoji: '👔', icon: IconNames.person },
  { key: 'connectingSet', emoji: '📱', icon: IconNames.refresh },
  { key: 'castingMagic', emoji: '🌟', icon: IconNames.star },
  { key: 'startingEngine', emoji: '🚀', icon: IconNames.play },
];

interface LoadingAnimationProps {
  theme: Theme;
  styles: any;
  currentMessageIndex: number;
  isComplete: boolean;
  loadingStage: 'prepare' | 'create';
  errorInfo: { title: string; message: string } | null;
  scaleValue: Animated.Value;
  spin: Animated.AnimatedInterpolation<string>;
  progressWidth: Animated.AnimatedInterpolation<string | number>;
  scenarioTitle: string;
  config: ConversationConfig;
  t: (key: string) => string;
}

export default function LoadingAnimation({
  theme,
  styles,
  currentMessageIndex,
  isComplete,
  loadingStage,
  errorInfo,
  scaleValue,
  spin,
  progressWidth,
  scenarioTitle,
  config,
  t,
}: LoadingAnimationProps) {
  const currentMessageConfig = loadingMessageKeys[currentMessageIndex];
  const currentMessageText = `${currentMessageConfig.emoji} ${t(`conversation.loading.messages.${currentMessageConfig.key}`)}`;

  return (
    <>
      {/* 主要动画区域 */}
      <View style={styles.animationContainer}>
        <Animated.View
          style={[
            styles.iconContainer,
            {
              transform: [
                { rotate: spin },
                { scale: scaleValue },
              ],
            },
          ]}
        >
          <Icon
            name={currentMessageConfig.icon}
            size={64}
            color={theme.colors.primary}
          />
        </Animated.View>
      </View>

      {/* 消息文本 */}
      <View style={styles.messageContainer}>
        <Text style={styles.messageText}>{currentMessageText}</Text>
        <Text style={styles.stageText}>
          {loadingStage === 'prepare'
            ? t('conversation.loading.preparingScene')
            : t('conversation.loading.creatingSession')}
        </Text>
      </View>

      {/* 进度条 */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <Animated.View
            style={[
              styles.progressFill,
              { width: progressWidth },
            ]}
          />
        </View>
      </View>

      {/* 完成状态 */}
      {isComplete && (
        <View style={styles.completeContainer}>
          <Icon name={IconNames.check} size={32} color={theme.colors.success} />
          <Text style={styles.completeText}>{t('conversation.loading.createSuccess')}</Text>
        </View>
      )}

      {/* 错误状态 */}
      {errorInfo && (
        <View style={styles.errorContainer}>
          <Icon name={IconNames.warning} size={32} color={theme.colors.error} />
          <Text style={styles.errorTitle}>{errorInfo.title}</Text>
          <Text style={styles.errorMessage}>{errorInfo.message}</Text>
          <Text style={styles.errorHint}>{t('conversation.loading.returningSoon')}</Text>
        </View>
      )}

      {/* 配置信息预览 */}
      <View style={styles.configPreview}>
        <Text style={styles.configTitle}>{t('conversation.loading.configTitle')}</Text>
        <View style={styles.configItem}>
          <Text style={styles.configLabel}>{t('conversation.loading.mode')}:</Text>
          <Text style={styles.configValue}>
            {config.mode === 'free'
              ? t('conversation.mode.free.title')
              : t('conversation.mode.scenario.title')}
          </Text>
        </View>
        {config.mode === 'scenario' && scenarioTitle && (
          <View style={styles.configItem}>
            <Text style={styles.configLabel}>{t('conversation.loading.scenario')}:</Text>
            <Text style={styles.configValue} numberOfLines={1}>
              {scenarioTitle}
            </Text>
          </View>
        )}
        <View style={styles.configItem}>
          <Text style={styles.configLabel}>{t('conversation.loading.difficulty')}:</Text>
          <Text style={styles.configValue}>
            {t(`conversation.difficulty.${config.difficulty}.label`)}
          </Text>
        </View>
        <View style={styles.configItem}>
          <Text style={styles.configLabel}>{t('conversation.loading.variant')}:</Text>
          <Text style={styles.configValue}>
            {t(`conversation.variant.${config.englishVariant}.label`)}
          </Text>
        </View>
        <View style={styles.configItem}>
          <Text style={styles.configLabel}>{t('conversation.loading.style')}:</Text>
          <Text style={styles.configValue}>
            {t(`conversation.style.${config.conversationStyle}.label`)}
          </Text>
        </View>
        {config.voiceName && (
          <View style={styles.configItem}>
            <Text style={styles.configLabel}>{t('conversation.loading.voice')}:</Text>
            <Text style={styles.configValue} numberOfLines={1}>
              {config.voiceName}
            </Text>
          </View>
        )}
        <View style={styles.configItem}>
          <Text style={styles.configLabel}>{t('conversation.loading.tips')}:</Text>
          <Text style={styles.configValue}>
            {config.enableTips ? t('common.on') : t('common.off')}
          </Text>
        </View>
      </View>
    </>
  );
}
