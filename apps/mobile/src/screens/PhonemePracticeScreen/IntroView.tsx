import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import Icon from '@/components/Icon';
import { Theme } from '@/context/ThemeProvider';
import { type Phoneme } from '@/data/phonemes';
import { createStyles } from './styles';

interface IntroViewProps {
  targetPhoneme: Phoneme;
  confusablePhoneme: Phoneme | null;
  tts: { isPlaying: boolean; isLoading: boolean };
  onPlayPhonemeWord: (word: string, phonemeIpa: string) => void;
  onStart: () => void;
  onBack: () => void;
  theme: Theme;
  t: (key: string, options?: any) => string;
}

export const IntroView: React.FC<IntroViewProps> = ({
  targetPhoneme,
  tts,
  onPlayPhonemeWord,
  onStart,
  onBack,
  theme,
  t,
}) => {
  const styles = createStyles(theme);
  const example = targetPhoneme.words[0];

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 返回按钮 */}
        <TouchableOpacity style={styles.introBackBtn} onPress={onBack} activeOpacity={0.7}>
          <Icon name="arrow-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>

        {/* 音素符号 + 名称 */}
        <View style={styles.introHeader}>
          <Text style={styles.introSymbolLarge}>/{targetPhoneme.symbol}/</Text>
          <Text style={styles.introNameText}>{targetPhoneme.name}</Text>
        </View>

        {/* 播放按钮 + 示例词 */}
        {example && (
          <TouchableOpacity
            style={styles.introPlayCard}
            onPress={() => onPlayPhonemeWord(example.word, targetPhoneme.symbol)}
            activeOpacity={0.7}
          >
            <View style={styles.introPlayIconWrap}>
              <Icon
                name={tts.isPlaying ? 'volume-up' : 'play-arrow'}
                size={24}
                color={theme.colors.text.inverse}
              />
            </View>
            <View style={styles.introPlayInfo}>
              <Text style={styles.introPlayWord}>{example.word}</Text>
              <Text style={styles.introPlayPhonetic}>{example.phonetic}</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* 发音要点 */}
        <View style={styles.introTipsCard}>
          <View style={styles.introTipRow}>
            <Icon name="record-voice-over" size={18} color={theme.colors.primary} />
            <Text style={styles.introTipLabel}>{t('phonemePractice.intro.mouthTip')}</Text>
          </View>
          <Text style={styles.introTipText}>{targetPhoneme.mouthTip}</Text>

          <View style={[styles.introTipRow, { marginTop: theme.spacing.md }]}>
            <Icon name="info-outline" size={18} color={theme.colors.primary} />
            <Text style={styles.introTipLabel}>{t('phonemePractice.intro.description')}</Text>
          </View>
          <Text style={styles.introTipText}>{targetPhoneme.description}</Text>
        </View>

        {/* 开始练习按钮 */}
        <TouchableOpacity style={styles.introStartBtn} onPress={onStart} activeOpacity={0.7}>
          <Text style={styles.introStartBtnText}>{t('phonemePractice.intro.startPractice')}</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
};
