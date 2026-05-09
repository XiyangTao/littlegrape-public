/**
 * 通用题型渲染器
 *
 * 根据 question.type 渲染对应的练习组件，封装 submitRef/onSubmitReady 逻辑。
 * 供闯关、复习、巩固练习共用。
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme, type Theme } from '@/context/ThemeProvider';
import type { GeneratedQuestion } from '@/services/QuestionGenerator';

// 练习组件
import MeaningChoiceView from '@/screens/exercise/ExerciseSessionScreen/components/MeaningChoiceView';
import ListenChoiceView from '@/screens/exercise/ExerciseSessionScreen/components/ListenChoiceView';
import MatchingPairsView from '@/screens/exercise/ExerciseSessionScreen/components/MatchingPairsView';
import FillBlankView from '@/screens/exercise/ExerciseSessionScreen/components/FillBlankView';
import CompleteTranslationView from '@/screens/exercise/ExerciseSessionScreen/components/CompleteTranslationView';
import ReadRespondView from '@/screens/exercise/ExerciseSessionScreen/components/ReadRespondView';
import PerfectPronunciationView from '@/screens/exercise/ExerciseSessionScreen/components/PerfectPronunciationView';
import TranslationView from '@/screens/exercise/ExerciseSessionScreen/components/TranslationView';
import SentenceShuffleView from '@/screens/exercise/ExerciseSessionScreen/components/SentenceShuffleView';
import ReadAloudView from '@/screens/exercise/ExerciseSessionScreen/components/ReadAloudView';
import DictationView from '@/screens/exercise/ExerciseSessionScreen/components/DictationView';
import ListenRepeatView from '@/screens/exercise/ExerciseSessionScreen/components/ListenRepeatView';
import { WordPuzzle } from '@/components/WordPuzzle';

// ==================== 类型 ====================

interface QuestionRendererProps {
  question: GeneratedQuestion;
  isAnswered: boolean;
  onAnswer: (correct: boolean) => void;
  submitRef: React.MutableRefObject<(() => void) | null>;
  onSubmitReady: (ready: boolean) => void;
}

// ==================== 组件 ====================

export default function QuestionRenderer({
  question,
  isAnswered,
  onAnswer,
  submitRef,
  onSubmitReady,
}: QuestionRendererProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const commonProps = {
    isAnswered,
    onAnswer,
    styles,
    theme,
  };

  const submitProps = {
    submitRef,
    onSubmitReady,
  };

  const renderQuestion = () => {
    switch (question.type) {
      // 单词级题型（自动提交）
      case 'meaning_choice':
        return <MeaningChoiceView question={question.question} {...commonProps} />;
      case 'listen_choice':
        return <ListenChoiceView question={question.question} {...commonProps} />;
      case 'matching_pairs':
        return <MatchingPairsView question={question.question} {...commonProps} />;
      case 'read_respond':
        return <ReadRespondView question={question.question} {...commonProps} />;
      case 'perfect_pronunciation':
        return <PerfectPronunciationView question={question.question} {...commonProps} />;

      // 单词级题型（需要 submitRef）
      case 'fill_blank':
        return <FillBlankView question={question.question} {...commonProps} {...submitProps} />;
      case 'complete_translation':
        return <CompleteTranslationView question={question.question} {...commonProps} {...submitProps} />;

      // 拼写拼图（特殊组件）
      case 'word_puzzle':
        return (
          <WordPuzzle
            parts={question.question.parts}
            correctParts={question.question.correctParts}
            onResult={onAnswer}
            disabled={isAnswered}
          />
        );

      // 句子级题型（自动提交）
      case 'read_aloud':
        return <ReadAloudView question={question.question} {...commonProps} />;
      case 'listen_repeat':
        return <ListenRepeatView question={question.question} {...commonProps} />;

      // 句子级题型（需要 submitRef）
      case 'translation':
        return <TranslationView question={question.question} {...commonProps} {...submitProps} />;
      case 'sentence_shuffle':
        return <SentenceShuffleView question={question.question} {...commonProps} {...submitProps} />;
      case 'dictation':
        return <DictationView question={question.question} {...commonProps} {...submitProps} />;

      default:
        return null;
    }
  };

  return (
    <View style={styles.questionSection}>
      {renderQuestion()}
    </View>
  );
}

// ==================== 样式 ====================

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    questionSection: {
      flex: 1,
      paddingHorizontal: 16,
      paddingTop: 8,
    },
    puzzleContainer: {
      flex: 1,
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
      marginBottom: theme.scale(20),
    },
    promptText: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.text.primary,
      lineHeight: theme.fontScale(28),
    },
    promptSubText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.tertiary,
      marginTop: 8,
      lineHeight: theme.fontScale(22),
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
      borderRadius: theme.scale(20),
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
      minHeight: theme.scale(56),
      backgroundColor: theme.colors.background.secondary,
      borderRadius: theme.spacing.borderRadius.base,
      padding: 12,
      marginBottom: theme.scale(20),
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      borderWidth: 2,
      borderColor: theme.colors.border.light,
      borderStyle: 'dashed',
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
      minHeight: theme.scale(52),
    },
    textInputFocused: {
      borderColor: theme.colors.primary,
    },

    // 提示
    hintText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.tertiary,
      marginBottom: 12,
      fontStyle: 'italic',
    },

    // TTS
    ttsButton: {
      width: theme.scale(80),
      height: theme.scale(80),
      borderRadius: theme.scale(40),
      backgroundColor: theme.colors.primary + '15',
      justifyContent: 'center',
      alignItems: 'center',
      alignSelf: 'center',
      marginBottom: 12,
    },
    ttsButtonPlaying: {
      backgroundColor: theme.colors.primary + '25',
    },
    ttsSlowButton: {
      width: theme.scale(48),
      height: theme.scale(48),
      borderRadius: theme.scale(24),
      backgroundColor: theme.colors.background.secondary,
      justifyContent: 'center',
      alignItems: 'center',
      alignSelf: 'center',
      marginBottom: theme.scale(24),
    },

    // 配对题
    pairsContainer: {
      flexDirection: 'row',
      gap: 12,
    },
    pairsColumn: {
      flex: 1,
      gap: 10,
    },
    pairItem: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.spacing.borderRadius.base,
      padding: 14,
      borderWidth: 2,
      borderColor: theme.colors.border.light,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 48,
    },
    pairItemSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primary + '08',
    },
    pairItemMatched: {
      borderColor: theme.colors.success,
      backgroundColor: theme.colors.success + '10',
      opacity: 0.5,
    },
    pairItemWrong: {
      borderColor: theme.colors.error,
      backgroundColor: theme.colors.error + '10',
    },
    pairItemText: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.text.primary,
      textAlign: 'center',
    },

    // 高亮
    highlightWord: {
      backgroundColor: theme.colors.primary + '20',
      color: theme.colors.primary,
      fontWeight: theme.typography.fontWeight.bold,
    },

    // 逐词对比
    wordCompare: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 12,
    },
    wordCorrect: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.success,
      fontWeight: theme.typography.fontWeight.medium,
    },
    wordWrong: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.error,
      fontWeight: theme.typography.fontWeight.medium,
      textDecorationLine: 'line-through',
    },
    wordMissing: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text.disabled,
      fontWeight: theme.typography.fontWeight.medium,
    },

    // 朗读评分
    recordButton: {
      width: theme.scale(72),
      height: theme.scale(72),
      borderRadius: theme.scale(36),
      backgroundColor: theme.colors.error + '15',
      justifyContent: 'center',
      alignItems: 'center',
      alignSelf: 'center',
      marginVertical: theme.scale(20),
    },
    recordButtonActive: {
      backgroundColor: theme.colors.error,
    },
    scoreCircle: {
      width: theme.scale(80),
      height: theme.scale(80),
      borderRadius: theme.scale(40),
      borderWidth: 4,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
      marginVertical: 16,
    },
    scoreText: {
      fontSize: theme.typography.fontSize['2xl'],
      fontWeight: theme.typography.fontWeight.bold,
    },
    scoreLabel: {
      fontSize: theme.typography.fontSize.xxs,
      color: theme.colors.text.secondary,
    },
    wordScoreContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      justifyContent: 'center',
      marginTop: 12,
    },
    wordScoreItem: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: theme.spacing.borderRadius.sm,
    },
    wordScoreText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
    },

    // 模式切换
    modeSwitch: {
      flexDirection: 'row',
      alignSelf: 'flex-end',
      marginBottom: 12,
      gap: 4,
    },
    modeSwitchButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: theme.spacing.borderRadius.base,
      backgroundColor: theme.colors.background.secondary,
    },
    modeSwitchButtonActive: {
      backgroundColor: theme.colors.primary,
    },
    modeSwitchText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.text.secondary,
    },
    modeSwitchTextActive: {
      color: theme.colors.text.inverse,
    },

    // 反馈条
    feedbackBar: {
      padding: 14,
      borderRadius: theme.spacing.borderRadius.base,
      marginTop: 16,
      flexDirection: 'row',
      alignItems: 'center',
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
