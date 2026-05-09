import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '@/components/Icon';
import { useTheme } from '@/context/ThemeProvider';
import type { Theme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import { DIFFICULTY_LABELS, DIFFICULTY_COLORS } from '@/data/grammarPoints';
import { useGrammarDetail } from './useGrammarDetail';
import { createStyles } from './styles';
import type { StructuredExplanation, GrammarUsage, GrammarExample, GrammarCommonError } from '@/api/modules/grammar';

type Styles = ReturnType<typeof createStyles>;

export default function GrammarDetailScreen() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const styles = createStyles(theme);

  const {
    point,
    category,
    explanation,
    isStructured,
    structuredExplanation,
    isLoading,
    tts,
    handlePlayTTS,
    handleStartPractice,
    handleStartLesson,
    handleGoBack,
  } = useGrammarDetail();

  if (!point) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{t('learn.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* 顶部导航栏 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <Icon name="keyboard-arrow-left" size={28} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{t('learn.grammarDetail')}</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* 标题区 */}
        <View style={styles.titleSection}>
          <Text style={styles.titleZh}>{point.nameZh}</Text>
          <Text style={styles.titleEn}>{point.nameEn}</Text>
          <View style={[styles.difficultyBadge, { backgroundColor: DIFFICULTY_COLORS[point.difficulty] + '15' }]}>
            <Text style={[styles.difficultyText, { color: DIFFICULTY_COLORS[point.difficulty] }]}>
              {DIFFICULTY_LABELS[point.difficulty]}
            </Text>
          </View>
        </View>

        {/* 讲解内容 */}
        <View style={styles.explanationSection}>
          {isLoading ? (
            <SkeletonContent styles={styles} />
          ) : isStructured && structuredExplanation ? (
            <StructuredContent
              data={structuredExplanation}
              tts={tts}
              onPlayTTS={handlePlayTTS}
              styles={styles}
              theme={theme}
            />
          ) : typeof explanation === 'string' ? (
            <View style={styles.sectionCard}>
              <Text style={styles.bodyText}>{explanation}</Text>
            </View>
          ) : (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={styles.loadingText}>{t('learn.loading')}</Text>
            </View>
          )}
        </View>

        {/* 底部按钮 */}
        <View style={styles.bottomSection}>
          <TouchableOpacity
            style={styles.practiceButton}
            onPress={handleStartLesson}
            activeOpacity={0.8}
          >
            <Icon name="school" size={20} color={theme.colors.text.inverse} />
            <Text style={styles.practiceButtonText}>{t('learn.startLesson')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.practiceButton, { backgroundColor: theme.colors.background.secondary, marginTop: 10 }]}
            onPress={handleStartPractice}
            activeOpacity={0.8}
          >
            <Icon name="quiz" size={20} color={theme.colors.primary} />
            <Text style={[styles.practiceButtonText, { color: theme.colors.primary }]}>{t('learn.startPractice')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ========== 结构化内容渲染 ==========

function StructuredContent({
  data,
  tts,
  onPlayTTS,
  styles,
  theme,
}: {
  data: StructuredExplanation;
  tts: { isLoading: boolean; isPlaying: boolean };
  onPlayTTS: () => void;
  styles: Styles;
  theme: Theme;
}) {
  const { t } = useI18n();
  const { sections } = data;

  return (
    <View>
      {/* AI讲解 header + TTS 按钮 */}
      <View style={styles.aiHeaderRow}>
        <View style={styles.aiLabelContainer}>
          <Icon name="auto-awesome" size={16} color={theme.colors.primary} />
          <Text style={styles.aiLabelText}>{t('learn.aiExplanation')}</Text>
        </View>
        <TouchableOpacity
          style={[styles.ttsButton, tts.isPlaying && styles.ttsButtonActive]}
          onPress={onPlayTTS}
          activeOpacity={0.7}
        >
          {tts.isLoading ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            <Icon
              name={tts.isPlaying ? 'stop' : 'record-voice-over'}
              size={18}
              color={tts.isPlaying ? theme.colors.text.inverse : theme.colors.primary}
            />
          )}
        </TouchableOpacity>
      </View>

      {/* 定义 */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>{t('learn.grammarSection.definition')}</Text>
        <Text style={styles.bodyText}>{sections.definition}</Text>
      </View>

      {/* 基本结构 */}
      {sections.structure ? (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t('learn.grammarSection.structure')}</Text>
          <View style={styles.structureBox}>
            <Text style={styles.structureText}>{sections.structure}</Text>
          </View>
        </View>
      ) : null}

      {/* 用法说明 */}
      {sections.usages?.length > 0 ? (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t('learn.grammarSection.usages')}</Text>
          {sections.usages.map((usage, index) => (
            <UsageItem key={`usage-${index}`} usage={usage} index={index} styles={styles} />
          ))}
        </View>
      ) : null}

      {/* 经典例句 */}
      {sections.examples?.length > 0 ? (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t('learn.grammarSection.examples')}</Text>
          {sections.examples.map((example, index) => (
            <ExampleItem key={`example-${index}`} example={example} styles={styles} />
          ))}
        </View>
      ) : null}

      {/* 常见错误 */}
      {sections.commonErrors?.length > 0 ? (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t('learn.grammarSection.commonErrors')}</Text>
          {sections.commonErrors.map((error, index) => (
            <ErrorItem key={`error-${index}`} error={error} styles={styles} theme={theme} />
          ))}
        </View>
      ) : null}

      {/* 记忆技巧 */}
      {sections.tips?.length > 0 ? (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t('learn.grammarSection.tips')}</Text>
          {sections.tips.map((tip, index) => (
            <View key={`tip-${index}`} style={styles.tipItem}>
              <Icon name="lightbulb-outline" size={18} color={theme.colors.warning} />
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

// ---------- 子组件 ----------

function UsageItem({ usage, index, styles }: {
  usage: GrammarUsage; index: number; styles: Styles;
}) {
  return (
    <View style={styles.usageItem}>
      <View style={styles.usageHeader}>
        <View style={styles.usageNumberBadge}>
          <Text style={styles.usageNumberText}>{index + 1}</Text>
        </View>
        <Text style={styles.usageTitle}>{usage.title}</Text>
      </View>
      {usage.description ? (
        <Text style={styles.usageDescription}>{usage.description}</Text>
      ) : null}
      <View style={styles.bilingualCard}>
        <Text style={styles.bilingualEn}>{usage.exampleEn}</Text>
        <Text style={styles.bilingualCn}>{usage.exampleCn}</Text>
      </View>
    </View>
  );
}

function ExampleItem({ example, styles }: {
  example: GrammarExample; styles: Styles;
}) {
  return (
    <View style={styles.bilingualCard}>
      <Text style={styles.bilingualEn}>
        {example.highlight
          ? renderHighlight(example.en, example.highlight, styles)
          : example.en}
      </Text>
      <Text style={styles.bilingualCn}>{example.cn}</Text>
    </View>
  );
}

function renderHighlight(text: string, highlight: string, styles: Styles) {
  const index = text.toLowerCase().indexOf(highlight.toLowerCase());
  if (index === -1) return text;

  return (
    <>
      {text.slice(0, index)}
      <Text style={styles.highlightText}>{text.slice(index, index + highlight.length)}</Text>
      {text.slice(index + highlight.length)}
    </>
  );
}

function ErrorItem({ error, styles, theme }: {
  error: GrammarCommonError; styles: Styles; theme: Theme;
}) {
  return (
    <View style={styles.errorCard}>
      <View style={styles.errorRow}>
        <Icon name="close" size={16} color={theme.colors.error} />
        <Text style={styles.errorWrongText}>{error.wrong}</Text>
      </View>
      <View style={styles.errorRow}>
        <Icon name="check" size={16} color={theme.colors.success} />
        <Text style={styles.errorCorrectText}>{error.correct}</Text>
      </View>
      <Text style={styles.errorExplanation}>{error.explanation}</Text>
    </View>
  );
}

function SkeletonContent({ styles }: { styles: Styles }) {
  return (
    <View style={styles.sectionCard}>
      <View style={[styles.skeletonLine, { width: '100%' }]} />
      <View style={[styles.skeletonLine, styles.skeletonMedium]} />
      <View style={[styles.skeletonLine, { width: '100%' }]} />
      <View style={[styles.skeletonLine, styles.skeletonShort]} />
      <View style={{ height: 16 }} />
      <View style={[styles.skeletonLine, { width: '100%' }]} />
      <View style={[styles.skeletonLine, styles.skeletonMedium]} />
      <View style={[styles.skeletonLine, { width: '100%' }]} />
    </View>
  );
}
