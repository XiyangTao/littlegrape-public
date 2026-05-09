/**
 * 复习专用题型渲染器
 *
 * 根据 API 预生成的题目 type 渲染对应的 Practice 组件。
 * fill_blank 随机 50% 选填 / 50% 拼接。
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, type Theme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import type { GeneratedQuestion } from '@/services/QuestionGenerator';

import FillBlankChoiceView from './components/FillBlankChoiceView';
import FillBlankPuzzleView from './components/FillBlankPuzzleView';
import CompleteTranslationView from './components/CompleteTranslationView';
import ReadRespondView from './components/ReadRespondView';
import SceneChoiceView from './components/SceneChoiceView';
import CollocationChoiceView from './components/CollocationChoiceView';
import UsageJudgeView from './components/UsageJudgeView';
import MeaningChoiceView from '@/screens/exercise/ExerciseSessionScreen/components/MeaningChoiceView';

interface PracticeQuestionRendererProps {
  question: GeneratedQuestion;
  isAnswered: boolean;
  isCorrect: boolean;
  onAnswer: (correct: boolean) => void;
  submitRef: React.MutableRefObject<(() => void) | null>;
  onSubmitReady: (ready: boolean) => void;
}

export default function PracticeQuestionRenderer({
  question,
  isAnswered,
  isCorrect,
  onAnswer,
  submitRef,
  onSubmitReady,
}: PracticeQuestionRendererProps) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const styles = createStyles(theme);

  // fill_blank 模式：基于 answer 内容确定性决定，同一题永远同一种模式
  const isPuzzleMode = useMemo(() => {
    if (question.type !== 'fill_blank') return false;
    const answer = question.question.answer || '';
    const hash = answer.split('').reduce((acc: number, c: string) => acc + c.charCodeAt(0), 0);
    return hash % 2 === 0;
  }, [question]);

  // 题型标签映射
  const typeLabel = useMemo(() => {
    if (question.type === 'fill_blank') {
      return isPuzzleMode ? t('wordPractice.questionType.fillBlankSpell') : t('wordPractice.questionType.fillBlankChoice');
    }
    const map: Record<string, string> = {
      meaning_choice: t('wordPractice.questionType.meaningChoice'),
      complete_translation: t('wordPractice.questionType.completeTranslation'),
      read_respond: t('wordPractice.questionType.readRespond'),
      scene_choice: t('wordPractice.questionType.sceneChoice'),
      collocation_choice: t('wordPractice.questionType.collocationChoice'),
      usage_judge: t('wordPractice.questionType.usageJudge'),
    };
    return map[question.type] || question.type;
  }, [question.type, isPuzzleMode, t]);

  const commonProps = {
    question: question.question,
    isAnswered,
    isCorrect,
    onAnswer,
    styles,
    theme,
  };

  const renderQuestion = () => {
    switch (question.type) {
      case 'meaning_choice':
        return <MeaningChoiceView {...commonProps} />;
      case 'fill_blank':
        return isPuzzleMode
          ? <FillBlankPuzzleView {...commonProps} />
          : <FillBlankChoiceView {...commonProps} />;
      case 'complete_translation':
        return <CompleteTranslationView {...commonProps} />;
      case 'read_respond':
        return <ReadRespondView {...commonProps} />;
      case 'scene_choice':
        return <SceneChoiceView {...commonProps} />;
      case 'collocation_choice':
        return <CollocationChoiceView {...commonProps} />;
      case 'usage_judge':
        return <UsageJudgeView {...commonProps} />;
      default:
        return null;
    }
  };

  return (
    <View style={styles.questionSection}>
      {question.type !== 'meaning_choice' && (
        <Text style={styles.questionType}>{typeLabel}</Text>
      )}
      {renderQuestion()}
    </View>
  );
}

// ==================== 样式 ====================
// 复用 QuestionRenderer 的样式 token，保持一致的视觉语言

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    questionSection: {
      flex: 1,
      paddingHorizontal: 16,
      paddingTop: 8,
    },

    // 题目区域
    questionType: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.primary,
      marginBottom: 12,
    },

    // 提示卡片
    promptCard: {
      backgroundColor: theme.colors.background.secondary,
      borderRadius: theme.spacing.borderRadius.base,
      padding: 16,
      marginBottom: 20,
    },
    promptText: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.text.primary,
      lineHeight: 28,
    },
    promptSubText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.tertiary,
      marginTop: 8,
      lineHeight: 22,
    },

    // 选项按钮
    optionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.card,
      borderRadius: theme.spacing.borderRadius.base,
      padding: 16,
      marginBottom: 10,
      borderWidth: 2,
      borderColor: theme.colors.border.light,
    },
    optionSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primary + '08',
    },
    optionCorrect: {
      borderColor: theme.colors.success,
      backgroundColor: theme.colors.success + '08',
    },
    optionIncorrect: {
      borderColor: theme.colors.error,
      backgroundColor: theme.colors.error + '08',
    },
    optionText: {
      flex: 1,
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text.primary,
    },
    optionIcon: {
      marginLeft: 8,
    },

    // 词块
    wordBankContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 16,
    },
    wordChip: {
      paddingHorizontal: 18,
      paddingVertical: 11,
      borderRadius: theme.spacing.borderRadius.lg,
      backgroundColor: theme.colors.card,
      borderWidth: 2,
      borderColor: theme.colors.border.light,
    },
    wordChipSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primary + '10',
    },
    wordChipCorrect: {
      borderColor: theme.colors.success,
      backgroundColor: theme.colors.success + '10',
    },
    wordChipIncorrect: {
      borderColor: theme.colors.error,
      backgroundColor: theme.colors.error + '10',
    },
    wordChipUsed: {
      opacity: 0.3,
    },
    wordChipText: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.text.primary,
    },
    wordChipTextSelected: {
      color: theme.colors.primary,
    },

    // 答案槽
    answerSlot: {
      minHeight: 56,
      backgroundColor: theme.colors.background.secondary,
      borderRadius: theme.spacing.borderRadius.base,
      padding: 12,
      marginBottom: 20,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      borderWidth: 2,
      borderColor: theme.colors.border.light,
      borderStyle: 'dashed',
      alignItems: 'center',
    },
    answerSlotFilled: {
      borderStyle: 'solid',
      borderColor: theme.colors.border.medium,
    },
    answerWord: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: theme.spacing.borderRadius.md,
      backgroundColor: theme.colors.primary + '15',
      borderWidth: 1,
      borderColor: theme.colors.primary + '30',
    },
    answerWordText: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.primary,
    },

    // 输入框
    textInput: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.spacing.borderRadius.base,
      padding: 16,
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text.primary,
      borderWidth: 2,
      borderColor: theme.colors.border.light,
      marginBottom: 16,
      minHeight: 52,
    },

    // 提示
    hintText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.tertiary,
      marginBottom: 12,
      fontStyle: 'italic',
    },

    // 反馈条
    feedbackBar: {
      padding: 14,
      borderRadius: theme.spacing.borderRadius.base,
      marginTop: 16,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
    },
    feedbackBarCorrect: {
      backgroundColor: theme.colors.success + '12',
    },
    feedbackBarIncorrect: {
      backgroundColor: theme.colors.error + '12',
    },
    feedbackText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    feedbackCorrectText: {
      color: theme.colors.success,
    },
    feedbackIncorrectText: {
      color: theme.colors.error,
    },
    feedbackAnswer: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.secondary,
      marginTop: 4,
    },
  });
