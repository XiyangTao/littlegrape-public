import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, Theme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import { useVoices } from '@/stores';
import Icon, { IconNames } from '@/components/Icon';
import SetupHeader from './SetupHeader';
import ProgressIndicator from './ProgressIndicator';
import { EnglishVariant, VoiceOption } from '@/types/conversation';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';

interface VoicePreferencesStepProps {
  variant: EnglishVariant;
  initialVoiceId?: string;
  initialEnableTips?: boolean;
  onComplete: (settings: { voiceId: string; voiceName: string; voiceGender: 'male' | 'female'; enableTips: boolean }) => void;
  onBack: () => void;
}

export default function VoicePreferencesStep({
  variant,
  initialVoiceId,
  initialEnableTips = true,
  onComplete,
  onBack,
}: VoicePreferencesStepProps) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const { getVoicesByVariant, isVoicesLoaded } = useVoices();
  const styles = createStyles(theme);

  // 从全局 Context 获取对应变体的声音列表
  const voices = useMemo(() => {
    return getVoicesByVariant(variant) as VoiceOption[];
  }, [variant, getVoicesByVariant]);

  const loading = !isVoicesLoaded;

  const [selectedVoiceId, setSelectedVoiceId] = useState(initialVoiceId || '');
  const [enableTips, setEnableTips] = useState(initialEnableTips);

  // 音频播放器
  const audioPlayer = useAudioPlayer();

  // 如果没有初始选中的voice，默认选中第一个
  useEffect(() => {
    if (!initialVoiceId && voices.length > 0 && !selectedVoiceId) {
      setSelectedVoiceId(voices[0].id);
    }
  }, [voices, initialVoiceId, selectedVoiceId]);

  // 组件卸载时清理音频资源
  useEffect(() => {
    return () => {
      audioPlayer.cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 只在组件卸载时执行

  const handleComplete = () => {
    const selectedVoice = voices.find(v => v.id === selectedVoiceId);
    const voiceName = selectedVoice?.name || selectedVoiceId;
    const voiceGender = selectedVoice?.gender || 'female';
    onComplete({ voiceId: selectedVoiceId, voiceName, voiceGender, enableTips });
  };

  const playVoicePreview = async (voiceId: string) => {
    try {
      // 查找对应的语音配置
      const voice = voices.find(v => v.id === voiceId);
      if (!voice) {
        console.error('未找到语音:', voiceId);
        return;
      }

      // 如果正在播放同一个音频，则停止
      if (audioPlayer.isPlaying && audioPlayer.currentUri === voice.sampleAudio) {
        await audioPlayer.stop();
        return;
      }

      // 播放示例音频
      await audioPlayer.play(voice.sampleAudio);
    } catch (error) {
      console.error('播放语音预览失败:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <SetupHeader title={t('conversation.voice.title')} onBack={onBack} />
      <ProgressIndicator currentStep={2} totalSteps={3} />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Loading状态 */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>{t('common.loading')}</Text>
          </View>
        )}

        {/* 声音选择和学习偏好 */}
        {!loading && (
          <>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
            <Icon name={IconNames.volume} size={20} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>
              {t('conversation.voice.selectVoice')} (
              {variant === 'american' ? t('conversation.variant.american.label') : t('conversation.variant.british.label')}
              )
            </Text>
          </View>

          <View style={styles.voiceList}>
            {voices.map((voice) => (
              <TouchableOpacity
                key={voice.id}
                style={[
                  styles.voiceCard,
                  selectedVoiceId === voice.id && styles.voiceCardActive,
                ]}
                onPress={() => setSelectedVoiceId(voice.id)}
                activeOpacity={0.7}
              >
                <View style={styles.voiceIcon}>
                  <Image
                    source={{ uri: voice.avatar }}
                    style={styles.voiceAvatar}
                  />
                </View>
                <View style={styles.voiceInfo}>
                  <Text
                    style={[
                      styles.voiceName,
                      selectedVoiceId === voice.id && styles.voiceNameActive,
                    ]}
                  >
                    {voice.name}
                  </Text>
                  <Text style={styles.voiceAccent}>{voice.accent}</Text>
                </View>
                <TouchableOpacity
                  style={styles.playButton}
                  onPress={() => playVoicePreview(voice.id)}
                  disabled={audioPlayer.isLoading}
                >
                  {audioPlayer.isLoading && audioPlayer.currentUri === voice.sampleAudio ? (
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                  ) : audioPlayer.isPlaying && audioPlayer.currentUri === voice.sampleAudio ? (
                    <Icon name={IconNames.stop} size={24} color={theme.colors.primary} />
                  ) : (
                    <Icon name={IconNames.play} size={24} color={theme.colors.primary} />
                  )}
                </TouchableOpacity>
                {selectedVoiceId === voice.id && (
                  <View style={styles.selectedBadge}>
                    <Icon name={IconNames.check} size={14} color={theme.colors.text.inverse} />
                  </View>
                )}
              </TouchableOpacity>
            ))}
              </View>
            </View>

            {/* 学习偏好 */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Icon name={IconNames.school} size={20} color={theme.colors.primary} />
                <Text style={styles.sectionTitle}>{t('conversation.voice.enableTips')}</Text>
              </View>

              <View style={styles.preferenceCard}>
                <View style={styles.preferenceInfo}>
                  <View style={styles.preferenceHeader}>
                    <Icon name={IconNames.lightbulb} size={24} color={theme.colors.primary} />
                    <Text style={styles.preferenceTitle}>
                      {t('conversation.voice.enableTips')}
                    </Text>
                  </View>
                  <Text style={styles.preferenceDesc}>
                    {t('conversation.voice.enableTipsDesc')}
                  </Text>
                </View>
                <Switch
                  value={enableTips}
                  onValueChange={setEnableTips}
                  trackColor={{
                    false: theme.colors.border.light,
                    true: theme.colors.primary + '40',
                  }}
                  thumbColor={enableTips ? theme.colors.primary : theme.colors.background.primary}
                />
              </View>
            </View>

            {/* 下一步按钮 */}
            <TouchableOpacity style={styles.startButton} onPress={handleComplete}>
              <Text style={styles.startButtonText}>{t('conversation.setup.next')}</Text>
              <Icon name={IconNames.next} size={20} color={theme.colors.text.inverse} />
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background.tertiary,
    },
    content: {
      flex: 1,
    },
    section: {
      paddingHorizontal: theme.spacing.lg,
      marginBottom: theme.spacing.xl,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      marginBottom: theme.spacing.md,
    },
    sectionTitle: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.primary,
    },
    // 声音列表样式
    voiceList: {
      gap: theme.spacing.sm,
    },
    voiceCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.background.primary,
      padding: theme.spacing.md,
      borderRadius: theme.spacing.borderRadius.md,
      borderWidth: 2,
      borderColor: theme.colors.border.light,
      position: 'relative',
    },
    voiceCardActive: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.background.secondary,
    },
    voiceIcon: {
      width: 48,
      height: 48,
      borderRadius: theme.spacing.borderRadius.xl,
      backgroundColor: theme.colors.background.tertiary,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    voiceAvatar: {
      width: 48,
      height: 48,
      borderRadius: theme.spacing.borderRadius.xl,
    },
    voiceInfo: {
      flex: 1,
      marginLeft: theme.spacing.sm,
    },
    voiceName: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.xxs,
    },
    voiceNameActive: {
      color: theme.colors.primary,
    },
    voiceAccent: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.text.secondary,
    },
    playButton: {
      padding: theme.spacing.xs,
    },
    selectedBadge: {
      position: 'absolute',
      top: theme.spacing.xs,
      right: theme.spacing.xs,
      backgroundColor: theme.colors.primary,
      width: 24,
      height: 24,
      borderRadius: theme.spacing.borderRadius.base,
      alignItems: 'center',
      justifyContent: 'center',
    },
    // 学习偏好样式
    preferenceCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.background.primary,
      padding: theme.spacing.md,
      borderRadius: theme.spacing.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.border.light,
      gap: theme.spacing.sm,
    },
    preferenceInfo: {
      flex: 1,
    },
    preferenceHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      marginBottom: theme.spacing.xs,
    },
    preferenceTitle: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.primary,
    },
    preferenceDesc: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.text.secondary,
      lineHeight: 18,
    },
    // 开始对话按钮
    startButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primary,
      marginHorizontal: theme.spacing.lg,
      marginVertical: theme.spacing.xl,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.spacing.borderRadius.lg,
      gap: theme.spacing.xs,
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    startButtonText: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.inverse,
    },
    // Loading和Error样式
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: theme.spacing['2xl'] * 2,
    },
    loadingText: {
      marginTop: theme.spacing.md,
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text.secondary,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: theme.spacing['2xl'] * 2,
      paddingHorizontal: theme.spacing.lg,
    },
    errorText: {
      marginTop: theme.spacing.md,
      marginBottom: theme.spacing.lg,
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text.secondary,
      textAlign: 'center',
    },
    retryButton: {
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
      backgroundColor: theme.colors.primary,
      borderRadius: theme.spacing.borderRadius.md,
    },
    retryButtonText: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.inverse,
    },
  });
