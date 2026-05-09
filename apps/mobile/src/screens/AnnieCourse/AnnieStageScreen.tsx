/**
 * 安妮老师的英语课 — 关卡内容 Screen.
 * 7 关共用一个 Screen, 按 stageId 分发到不同子组件.
 *
 * MVP 范围:
 *  - objectives / dialogue / choice / listening / summary 5 关做完整 UI
 *  - pronunciation / conversation 2 关只做"完成"按钮 + mock 写进度 (后续接录音 + 评分)
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect, RouteProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, Theme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import { apiClient } from '@/api';
import type {
  AnnieLessonDetail,
  AnnieScriptItem,
  AnnieDialogueItem,
  AnnieNarrationItem,
  AnnieChoiceQuestion,
  AnnieListeningQuestion,
  AnnieKeyExpression,
  AnnieStageChoice,
  AnnieStageListening,
  AnnieStagePronunciation,
  AnnieStageConversation,
} from '@/api/modules/annie';
import Icon, { IconNames } from '@/components/Icon';

type StageId = 'objectives' | 'dialogue' | 'pronunciation' | 'choice' | 'listening' | 'conversation' | 'summary';
type RouteParams = { course: string; lessonNumber: number; stageId: StageId };

export default function AnnieStageScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<Record<string, RouteParams>, string>>();
  const { course, lessonNumber, stageId } = route.params;
  const { theme } = useTheme();
  const { t } = useI18n();
  const styles = createStyles(theme);

  const [lesson, setLesson] = useState<AnnieLessonDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          setIsLoading(true);
          const data = await apiClient.getAnnieLesson(course, lessonNumber);
          if (!cancelled) setLesson(data);
        } catch (e) {
          console.error('加载安妮单课 (stage) 失败:', e);
        } finally {
          if (!cancelled) setIsLoading(false);
        }
      })();
      return () => { cancelled = true; };
    }, [course, lessonNumber])
  );

  if (isLoading || !lesson) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Header onBack={() => navigation.goBack()} title="" theme={theme} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const headerTitle = t(`annie.stage.${stageId}.title`);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header onBack={() => navigation.goBack()} title={headerTitle} theme={theme} />
      {stageId === 'objectives'    && <ObjectivesStage lesson={lesson} theme={theme} t={t} />}
      {stageId === 'dialogue'      && <DialogueStage lesson={lesson} theme={theme} t={t} />}
      {stageId === 'pronunciation' && <PronunciationStage lesson={lesson} course={course} lessonNumber={lessonNumber} theme={theme} t={t} onDone={() => navigation.goBack()} />}
      {stageId === 'choice'        && <ChoiceStage lesson={lesson} course={course} lessonNumber={lessonNumber} theme={theme} t={t} onDone={() => navigation.goBack()} />}
      {stageId === 'listening'     && <ListeningStage lesson={lesson} course={course} lessonNumber={lessonNumber} theme={theme} t={t} onDone={() => navigation.goBack()} />}
      {stageId === 'conversation'  && <ConversationStage lesson={lesson} course={course} lessonNumber={lessonNumber} theme={theme} t={t} onDone={() => navigation.goBack()} />}
      {stageId === 'summary'       && <SummaryStage lesson={lesson} theme={theme} t={t} />}
    </SafeAreaView>
  );
}

// ==================== 关 1: Objectives ====================

function ObjectivesStage({ lesson, theme, t }: { lesson: AnnieLessonDetail; theme: Theme; t: (k: string, p?: any) => string }) {
  const styles = createStyles(theme);
  return (
    <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
      <Text style={styles.sectionLabel}>{t('annie.objectives.objectivesLabel')}</Text>
      {lesson.learningObjectives.map(obj => (
        <View key={obj.id} style={styles.bulletRow}>
          <View style={styles.bulletDot} />
          <View style={{ flex: 1 }}>
            <Text style={styles.bulletEn}>{obj.english}</Text>
            <Text style={styles.bulletZh}>{obj.chinese}</Text>
          </View>
        </View>
      ))}

      <Text style={[styles.sectionLabel, { marginTop: theme.spacing.lg }]}>{t('annie.objectives.expressionsLabel')}</Text>
      {lesson.keyExpressions.map(ke => (
        <View key={ke.id} style={styles.expressionCard}>
          <Text style={styles.expressionEn}>{ke.english}</Text>
          <Text style={styles.expressionZh}>{ke.chinese}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

// ==================== 关 2: Dialogue ====================

function DialogueStage({ lesson, theme, t }: { lesson: AnnieLessonDetail; theme: Theme; t: (k: string, p?: any) => string }) {
  const styles = createStyles(theme);
  const items: (AnnieDialogueItem | AnnieNarrationItem)[] = useMemo(
    () => lesson.script.filter(s => s.type === 'dialogue' || s.type === 'narration') as any,
    [lesson.script]
  );

  return (
    <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
      {items.map((item, idx) => {
        if (item.type === 'narration') {
          return (
            <View key={idx} style={styles.narrationBubble}>
              <Text style={styles.narrationLabel}>{t('annie.dialogue.teacherLabel')}</Text>
              <Text style={styles.narrationText}>{item.text}</Text>
            </View>
          );
        }
        const isAnnie = item.character === 'annie';
        return (
          <View key={idx} style={[styles.dialogueRow, isAnnie ? styles.dialogueRowRight : styles.dialogueRowLeft]}>
            <View style={[styles.dialogueBubble, isAnnie ? styles.dialogueBubbleSelf : styles.dialogueBubbleOther]}>
              <Text style={styles.dialogueSpeaker}>{item.character}</Text>
              <Text style={[styles.dialogueLine, isAnnie && styles.dialogueLineSelf]}>{item.line}</Text>
              <Text style={[styles.dialogueLineZh, isAnnie && styles.dialogueLineZhSelf]}>{item.line_zh}</Text>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

// ==================== 关 3: Pronunciation (占位) ====================

function PronunciationStage({
  lesson, course, lessonNumber, theme, t, onDone,
}: { lesson: AnnieLessonDetail; course: string; lessonNumber: number; theme: Theme; t: (k: string, p?: any) => string; onDone: () => void }) {
  const styles = createStyles(theme);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const kes: AnnieKeyExpression[] = lesson.keyExpressions;

  const handleMockComplete = async () => {
    try {
      setIsSubmitting(true);
      const now = new Date().toISOString();
      const data: AnnieStagePronunciation[] = kes.map(ke => ({ keId: ke.id, score: 85, attempts: 1, lastTriedAt: now }));
      await apiClient.updateAnnieProgress(course, lessonNumber, { stage3Pronunciation: data });
      onDone();
    } catch (e) {
      Alert.alert(t('annie.error.title'), t('annie.error.submitFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
      <Text style={styles.placeholderTitle}>{t('annie.pronunciation.placeholderTitle')}</Text>
      <Text style={styles.placeholderDesc}>{t('annie.pronunciation.placeholderDesc')}</Text>
      <View style={styles.kesPreviewBox}>
        {kes.map(ke => (
          <Text key={ke.id} style={styles.kesPreviewLine}>· {ke.english}</Text>
        ))}
      </View>
      <TouchableOpacity style={styles.primaryButton} onPress={handleMockComplete} disabled={isSubmitting}>
        {isSubmitting
          ? <ActivityIndicator color={theme.colors.text.inverse} />
          : <Text style={styles.primaryButtonText}>{t('annie.common.markCompleteMock')}</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

// ==================== 关 4: Choice ====================

function ChoiceStage({
  lesson, course, lessonNumber, theme, t, onDone,
}: { lesson: AnnieLessonDetail; course: string; lessonNumber: number; theme: Theme; t: (k: string, p?: any) => string; onDone: () => void }) {
  const styles = createStyles(theme);
  const questions: AnnieChoiceQuestion[] = useMemo(
    () => lesson.script.filter(s => s.type === 'question' && (s as any).question_type === 'choice') as any,
    [lesson.script]
  );
  const [answers, setAnswers] = useState<Record<number, number>>({});  // qIdx -> selectedOption

  const allAnswered = questions.every((_, i) => answers[i] !== undefined);

  const handleSubmit = async () => {
    const data: AnnieStageChoice[] = questions.map((q, i) => {
      const sel = answers[i];
      return { index: i, selectedOption: sel, correct: !!q.options[sel]?.correct };
    });
    try {
      await apiClient.updateAnnieProgress(course, lessonNumber, { stage4Choice: data });
      onDone();
    } catch (e) {
      Alert.alert(t('annie.error.title'), t('annie.error.submitFailed'));
    }
  };

  if (questions.length === 0) {
    return <EmptyStage theme={theme} text={t('annie.choice.empty')} />;
  }

  return (
    <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
      {questions.map((q, qIdx) => (
        <View key={qIdx} style={styles.questionCard}>
          <Text style={styles.questionIndex}>{t('annie.choice.questionIndex', { idx: qIdx + 1, total: questions.length })}</Text>
          <Text style={styles.questionPromptEn}>{q.prompt}</Text>
          <Text style={styles.questionPromptZh}>{q.prompt_zh}</Text>
          {q.options.map((opt, oIdx) => {
            const selected = answers[qIdx] === oIdx;
            return (
              <TouchableOpacity
                key={oIdx}
                style={[styles.optionCard, selected && styles.optionCardSelected]}
                onPress={() => setAnswers(prev => ({ ...prev, [qIdx]: oIdx }))}
                activeOpacity={0.85}
              >
                <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{opt.text}</Text>
                <Text style={[styles.optionTextZh, selected && styles.optionTextZhSelected]}>{opt.text_zh}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
      <TouchableOpacity
        style={[styles.primaryButton, !allAnswered && styles.primaryButtonDisabled]}
        onPress={handleSubmit}
        disabled={!allAnswered}
      >
        <Text style={styles.primaryButtonText}>{t('annie.common.submit')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ==================== 关 5: Listening ====================

function ListeningStage({
  lesson, course, lessonNumber, theme, t, onDone,
}: { lesson: AnnieLessonDetail; course: string; lessonNumber: number; theme: Theme; t: (k: string, p?: any) => string; onDone: () => void }) {
  const styles = createStyles(theme);
  const questions: AnnieListeningQuestion[] = useMemo(
    () => lesson.script.filter(s => s.type === 'question' && (s as any).question_type === 'listening') as any,
    [lesson.script]
  );
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const allAnswered = questions.every((_, i) => answers[i] !== undefined);

  const handleSubmit = async () => {
    const data: AnnieStageListening[] = questions.map((q, i) => {
      const sel = answers[i];
      return { index: i, selectedOption: sel, correct: !!q.options[sel]?.correct };
    });
    try {
      await apiClient.updateAnnieProgress(course, lessonNumber, { stage5Listening: data });
      onDone();
    } catch (e) {
      Alert.alert(t('annie.error.title'), t('annie.error.submitFailed'));
    }
  };

  if (questions.length === 0) {
    return <EmptyStage theme={theme} text={t('annie.listening.empty')} />;
  }

  return (
    <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
      {questions.map((q, qIdx) => (
        <View key={qIdx} style={styles.questionCard}>
          <View style={styles.audioPlaceholder}>
            <Icon name={IconNames.volume} size={24} color={theme.colors.primary} />
            <Text style={styles.audioPlaceholderText}>{t('annie.listening.audioPlaceholder')}</Text>
            <Text style={styles.audioLineFallback}>"{q.audio_line}"</Text>
          </View>
          <Text style={styles.questionPromptEn}>{q.prompt}</Text>
          <Text style={styles.questionPromptZh}>{q.prompt_zh}</Text>
          {q.options.map((opt, oIdx) => {
            const selected = answers[qIdx] === oIdx;
            return (
              <TouchableOpacity
                key={oIdx}
                style={[styles.optionCard, selected && styles.optionCardSelected]}
                onPress={() => setAnswers(prev => ({ ...prev, [qIdx]: oIdx }))}
                activeOpacity={0.85}
              >
                <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{opt.text}</Text>
                <Text style={[styles.optionTextZh, selected && styles.optionTextZhSelected]}>{opt.text_zh}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
      <TouchableOpacity
        style={[styles.primaryButton, !allAnswered && styles.primaryButtonDisabled]}
        onPress={handleSubmit}
        disabled={!allAnswered}
      >
        <Text style={styles.primaryButtonText}>{t('annie.common.submit')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ==================== 关 6: Conversation (占位) ====================

function ConversationStage({
  lesson, course, lessonNumber, theme, t, onDone,
}: { lesson: AnnieLessonDetail; course: string; lessonNumber: number; theme: Theme; t: (k: string, p?: any) => string; onDone: () => void }) {
  const styles = createStyles(theme);
  const questions = useMemo(
    () => lesson.script.filter(s => s.type === 'question' && (s as any).question_type === 'conversation') as any[],
    [lesson.script]
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleMockComplete = async () => {
    try {
      setIsSubmitting(true);
      const data: AnnieStageConversation[] = questions.map((_q, i) => ({
        index: i, achieved: true, qualityScore: 8,
      }));
      await apiClient.updateAnnieProgress(course, lessonNumber, { stage6Conversation: data, markComplete: true });
      onDone();
    } catch (e) {
      Alert.alert(t('annie.error.title'), t('annie.error.submitFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
      <Text style={styles.placeholderTitle}>{t('annie.conversation.placeholderTitle')}</Text>
      <Text style={styles.placeholderDesc}>{t('annie.conversation.placeholderDesc')}</Text>

      {questions.map((q: any, idx: number) => (
        <View key={idx} style={styles.conversationCard}>
          <Text style={styles.conversationContext}>{q.context_zh}</Text>
          <Text style={styles.conversationGoal}>🎯 {q.goal_zh}</Text>
          <Text style={styles.conversationHint}>💡 {q.hint_zh}</Text>
          <Text style={styles.conversationExpected}>{q.expected_answer}</Text>
        </View>
      ))}

      <TouchableOpacity style={styles.primaryButton} onPress={handleMockComplete} disabled={isSubmitting}>
        {isSubmitting
          ? <ActivityIndicator color={theme.colors.text.inverse} />
          : <Text style={styles.primaryButtonText}>{t('annie.common.markCompleteMock')}</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

// ==================== 关 7: Summary ====================

function SummaryStage({ lesson, theme, t }: { lesson: AnnieLessonDetail; theme: Theme; t: (k: string, p?: any) => string }) {
  const styles = createStyles(theme);
  return (
    <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
      <View style={styles.summaryHeader}>
        <Text style={styles.summaryTitle}>{t('annie.summary.title')}</Text>
        <Text style={styles.summaryScore}>{lesson.totalScore}</Text>
        <Text style={styles.summaryLabel}>{t('annie.summary.scoreLabel')}</Text>
      </View>

      <Text style={styles.sectionLabel}>{t('annie.summary.expressionsLearned')}</Text>
      {lesson.keyExpressions.map(ke => (
        <View key={ke.id} style={styles.expressionCard}>
          <Text style={styles.expressionEn}>{ke.english}</Text>
          <Text style={styles.expressionZh}>{ke.chinese}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

// ==================== Helpers ====================

function Header({ onBack, title, theme }: { onBack: () => void; title: string; theme: Theme }) {
  const styles = createStyles(theme);
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Icon name={IconNames.left} size={24} color={theme.colors.text.primary} />
      </TouchableOpacity>
      <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
      <View style={styles.backButton} />
    </View>
  );
}

function EmptyStage({ theme, text }: { theme: Theme; text: string }) {
  const styles = createStyles(theme);
  return <View style={styles.loadingContainer}><Text style={styles.placeholderDesc}>{text}</Text></View>;
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background.primary },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md, height: 56,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border.light,
  },
  backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: theme.typography.fontSize.lg, fontWeight: theme.typography.fontWeight.semibold, color: theme.colors.text.primary, flex: 1, textAlign: 'center' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1 },
  contentInner: { padding: theme.spacing.md, paddingBottom: theme.spacing.xl },

  sectionLabel: { fontSize: theme.typography.fontSize.sm, fontWeight: theme.typography.fontWeight.semibold, color: theme.colors.text.secondary, marginBottom: theme.spacing.sm },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: theme.spacing.md },
  bulletDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.primary, marginTop: 8, marginRight: theme.spacing.sm },
  bulletEn: { fontSize: theme.typography.fontSize.base, color: theme.colors.text.primary, lineHeight: 22 },
  bulletZh: { fontSize: theme.typography.fontSize.sm, color: theme.colors.text.secondary, lineHeight: 20, marginTop: 2 },
  expressionCard: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.spacing.borderRadius.base,
    padding: theme.spacing.md, marginBottom: theme.spacing.sm,
  },
  expressionEn: { fontSize: theme.typography.fontSize.base, fontWeight: theme.typography.fontWeight.semibold, color: theme.colors.text.primary },
  expressionZh: { fontSize: theme.typography.fontSize.sm, color: theme.colors.text.secondary, marginTop: 2 },

  // dialogue
  narrationBubble: {
    backgroundColor: theme.colors.background.tertiary,
    borderLeftWidth: 3, borderLeftColor: theme.colors.primary,
    padding: theme.spacing.md, marginBottom: theme.spacing.sm,
    borderRadius: theme.spacing.borderRadius.sm,
  },
  narrationLabel: { fontSize: theme.typography.fontSize.xs, color: theme.colors.primary, fontWeight: theme.typography.fontWeight.semibold, marginBottom: 4 },
  narrationText: { fontSize: theme.typography.fontSize.sm, color: theme.colors.text.primary, lineHeight: 22 },
  dialogueRow: { flexDirection: 'row', marginBottom: theme.spacing.sm },
  dialogueRowLeft: { justifyContent: 'flex-start' },
  dialogueRowRight: { justifyContent: 'flex-end' },
  dialogueBubble: { maxWidth: '85%', padding: theme.spacing.sm, borderRadius: theme.spacing.borderRadius.base },
  dialogueBubbleOther: { backgroundColor: theme.colors.background.secondary },
  dialogueBubbleSelf: { backgroundColor: theme.colors.primary },
  dialogueSpeaker: { fontSize: theme.typography.fontSize.xs, color: theme.colors.text.tertiary, marginBottom: 2 },
  dialogueLine: { fontSize: theme.typography.fontSize.base, color: theme.colors.text.primary, lineHeight: 22 },
  dialogueLineSelf: { color: theme.colors.text.inverse },
  dialogueLineZh: { fontSize: theme.typography.fontSize.xs, color: theme.colors.text.secondary, marginTop: 2 },
  dialogueLineZhSelf: { color: theme.colors.text.inverse, opacity: 0.85 },

  // placeholders
  placeholderTitle: { fontSize: theme.typography.fontSize.lg, fontWeight: theme.typography.fontWeight.semibold, color: theme.colors.text.primary, marginBottom: theme.spacing.sm },
  placeholderDesc: { fontSize: theme.typography.fontSize.sm, color: theme.colors.text.secondary, lineHeight: 22, marginBottom: theme.spacing.lg },
  kesPreviewBox: { backgroundColor: theme.colors.background.secondary, padding: theme.spacing.md, borderRadius: theme.spacing.borderRadius.sm, marginBottom: theme.spacing.lg },
  kesPreviewLine: { fontSize: theme.typography.fontSize.sm, color: theme.colors.text.primary, marginBottom: 4 },

  // questions
  questionCard: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.spacing.borderRadius.base,
    padding: theme.spacing.md, marginBottom: theme.spacing.md,
  },
  questionIndex: { fontSize: theme.typography.fontSize.xs, color: theme.colors.primary, fontWeight: theme.typography.fontWeight.semibold, marginBottom: theme.spacing.sm },
  questionPromptEn: { fontSize: theme.typography.fontSize.base, fontWeight: theme.typography.fontWeight.semibold, color: theme.colors.text.primary, marginBottom: 2 },
  questionPromptZh: { fontSize: theme.typography.fontSize.sm, color: theme.colors.text.secondary, marginBottom: theme.spacing.sm },
  optionCard: {
    backgroundColor: theme.colors.background.primary,
    borderWidth: 1, borderColor: theme.colors.border.light,
    borderRadius: theme.spacing.borderRadius.sm,
    padding: theme.spacing.sm, marginBottom: theme.spacing.xs,
  },
  optionCardSelected: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary },
  optionText: { fontSize: theme.typography.fontSize.sm, color: theme.colors.text.primary },
  optionTextZh: { fontSize: theme.typography.fontSize.xs, color: theme.colors.text.secondary, marginTop: 2 },
  optionTextSelected: { color: theme.colors.text.inverse },
  optionTextZhSelected: { color: theme.colors.text.inverse, opacity: 0.85 },

  // listening audio placeholder
  audioPlaceholder: {
    backgroundColor: theme.colors.background.tertiary,
    padding: theme.spacing.md, borderRadius: theme.spacing.borderRadius.sm,
    alignItems: 'center', marginBottom: theme.spacing.sm,
  },
  audioPlaceholderText: { fontSize: theme.typography.fontSize.xs, color: theme.colors.text.tertiary, marginTop: theme.spacing.xs },
  audioLineFallback: { fontSize: theme.typography.fontSize.sm, color: theme.colors.text.primary, fontStyle: 'italic', marginTop: theme.spacing.xs },

  // conversation
  conversationCard: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.spacing.borderRadius.base,
    padding: theme.spacing.md, marginBottom: theme.spacing.sm,
  },
  conversationContext: { fontSize: theme.typography.fontSize.sm, color: theme.colors.text.primary, lineHeight: 20, marginBottom: theme.spacing.xs },
  conversationGoal: { fontSize: theme.typography.fontSize.sm, color: theme.colors.primary, marginBottom: 4 },
  conversationHint: { fontSize: theme.typography.fontSize.xs, color: theme.colors.text.secondary, marginBottom: theme.spacing.sm },
  conversationExpected: { fontSize: theme.typography.fontSize.sm, color: theme.colors.text.tertiary, fontStyle: 'italic' },

  // summary
  summaryHeader: { alignItems: 'center', paddingVertical: theme.spacing.xl },
  summaryTitle: { fontSize: theme.typography.fontSize.lg, color: theme.colors.text.secondary },
  summaryScore: { fontSize: theme.typography.fontSize['5xl'], fontWeight: theme.typography.fontWeight.bold, color: theme.colors.primary, marginTop: theme.spacing.sm },
  summaryLabel: { fontSize: theme.typography.fontSize.xs, color: theme.colors.text.tertiary, marginTop: theme.spacing.xs },

  // primary button
  primaryButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.spacing.borderRadius.base,
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  primaryButtonDisabled: { backgroundColor: theme.colors.background.tertiary },
  primaryButtonText: { color: theme.colors.text.inverse, fontWeight: theme.typography.fontWeight.semibold, fontSize: theme.typography.fontSize.base },
});
