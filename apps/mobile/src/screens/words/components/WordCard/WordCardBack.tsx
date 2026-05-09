/**
 * 卡片反面：词根词缀、释义、常用搭配、AI讲解
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import Icon from '@/components/Icon';
import { Theme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import type { LearnWordWithProgress } from '@/types/word';
import { createStyles } from './styles';

interface WordCardBackProps {
  word: LearnWordWithProgress;
  parsed: ReturnType<typeof import('@/services/WordService').parseLocalWord>;
  aiTts: { isLoading: boolean; isPlaying: boolean };
  isGeneratingAi: boolean;
  aiError: string | null;
  theme: Theme;
  cardHeight: number;
  backAnimatedStyle: any;
  isFlipped: boolean;
  onFlip: () => void;
  onAiExplanation: () => void;
}

const WordCardBack = React.memo(({
  word,
  parsed,
  aiTts,
  isGeneratingAi,
  aiError,
  theme,
  cardHeight,
  backAnimatedStyle,
  isFlipped,
  onFlip,
  onAiExplanation,
}: WordCardBackProps) => {
  const styles = createStyles(theme, cardHeight);
  const { t } = useI18n();

  return (
    <Animated.View style={[styles.cardFace, styles.backFace, backAnimatedStyle]} pointerEvents={isFlipped ? 'auto' : 'none'}>
      <ScrollView style={styles.backScrollView} contentContainerStyle={styles.backScrollContent} showsVerticalScrollIndicator>
        {/* 顶部工具栏 */}
        <View style={styles.backHeader}>
          <TouchableOpacity style={styles.backHeaderButton} onPress={onFlip} activeOpacity={0.7}>
            <Icon name="arrow-back" size={22} color={theme.colors.text.secondary} />
          </TouchableOpacity>

          <Text style={styles.backWordText}>{word.word}</Text>

          <TouchableOpacity
            style={[styles.backHeaderButton, aiTts.isPlaying && styles.backHeaderButtonActive]}
            onPress={onAiExplanation}
            disabled={isGeneratingAi}
            activeOpacity={0.7}
          >
            {isGeneratingAi ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <Icon
                name={aiTts.isPlaying ? 'stop' : 'record-voice-over'}
                size={22}
                color={aiTts.isPlaying ? theme.colors.text.inverse : theme.colors.primary}
              />
            )}
          </TouchableOpacity>
        </View>

        {/* 词根词缀 */}
        {parsed.etymology && (parsed.etymology.prefix || parsed.etymology.root || parsed.etymology.suffix || parsed.etymology.analysis) && (
          <View style={styles.backSection}>
            <Text style={styles.backSectionTitle}>{t('wordCard.etymology')}</Text>
            <View style={styles.etymologyContainer}>
              {parsed.etymology.prefix && (
                <View style={styles.etymologyItem}>
                  <Text style={styles.etymologyLabel}>{t('wordCard.prefix')}</Text>
                  <Text style={styles.etymologyText}>
                    {parsed.etymology.prefix}
                    {parsed.etymology.prefixMeaning && ` (${parsed.etymology.prefixMeaning})`}
                  </Text>
                </View>
              )}
              {parsed.etymology.root && (
                <View style={styles.etymologyItem}>
                  <Text style={styles.etymologyLabel}>{t('wordCard.root')}</Text>
                  <Text style={styles.etymologyText}>
                    {parsed.etymology.root}
                    {parsed.etymology.rootMeaning && ` (${parsed.etymology.rootMeaning})`}
                  </Text>
                </View>
              )}
              {parsed.etymology.suffix && (
                <View style={styles.etymologyItem}>
                  <Text style={styles.etymologyLabel}>{t('wordCard.suffix')}</Text>
                  <Text style={styles.etymologyText}>
                    {parsed.etymology.suffix}
                    {parsed.etymology.suffixMeaning && ` (${parsed.etymology.suffixMeaning})`}
                  </Text>
                </View>
              )}
              {parsed.etymology.analysis && <Text style={styles.analysisText}>{parsed.etymology.analysis}</Text>}
            </View>
          </View>
        )}

        {/* 释义 */}
        {parsed.meanings.length > 0 && (
          <View style={styles.backSection}>
            <Text style={styles.backSectionTitle}>{t('wordCard.meanings')}</Text>
            {parsed.meanings.map((meaning, index) => (
              <View key={meaning.id || index} style={styles.meaningItemBack}>
                <View style={styles.meaningHeader}>
                  <Text style={styles.posTextBack}>{meaning.pos}</Text>
                  <Text style={styles.meaningCnBack}>{meaning.meaningCn}</Text>
                </View>
                {meaning.meaningEn && <Text style={styles.meaningEnBack}>{meaning.meaningEn}</Text>}
                {meaning.exampleEn && (
                  <View style={styles.exampleBack}>
                    <Text style={styles.exampleEnBack}>{meaning.exampleEn}</Text>
                    {meaning.exampleCn && <Text style={styles.exampleCnBack}>{meaning.exampleCn}</Text>}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* 常用搭配 */}
        {parsed.collocations.length > 0 && (
          <View style={styles.backSection}>
            <Text style={styles.backSectionTitle}>{t('wordCard.collocations')}</Text>
            {parsed.collocations.map((collocation, index) => (
              <View key={collocation.id || index} style={styles.collocationItem}>
                <Text style={styles.collocationPattern}>{collocation.pattern}</Text>
                <Text style={styles.collocationMeaning}>{collocation.meaningCn}</Text>
              </View>
            ))}
          </View>
        )}

        {aiError && <Text style={styles.aiErrorText}>{aiError}</Text>}
      </ScrollView>
    </Animated.View>
  );
});

export default WordCardBack;
