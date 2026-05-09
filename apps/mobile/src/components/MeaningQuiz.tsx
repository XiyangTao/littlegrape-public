/**
 * 看词选义组件
 * 显示单词，选择正确或错误的释义
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { useTheme, Theme } from '@/context/ThemeProvider';
import Icon from '@/components/Icon';

// 题目类型：选正确 或 选错误
export type QuizType = 'select_correct' | 'select_wrong';

interface MeaningQuizProps {
  /** 单词 */
  word: string;
  /** 正确的释义（可以是单个或多个） */
  correctMeanings: string[];
  /** 干扰选项（错误的释义） */
  distractors: string[];
  /** 题目类型 */
  quizType: QuizType;
  /** 答题结果回调 */
  onResult: (isCorrect: boolean) => void;
  /** 是否禁用交互 */
  disabled?: boolean;
}

// 打乱数组
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export default function MeaningQuiz({
  word,
  correctMeanings,
  distractors,
  quizType,
  onResult,
  disabled = false,
}: MeaningQuizProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  // 选中的选项索引
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  // 答题结果
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null);
  // 抖动动画
  const shakeAnim = useState(new Animated.Value(0))[0];

  // 生成选项列表（打乱顺序）
  const options = useMemo(() => {
    const allOptions = [
      ...correctMeanings.map(m => ({ text: m, isCorrect: true })),
      ...distractors.map(d => ({ text: d, isCorrect: false })),
    ];
    return shuffleArray(allOptions);
  }, [correctMeanings, distractors]);

  // 题目关键词（正确/错误）
  const keywordInfo = useMemo(() => {
    if (quizType === 'select_correct') {
      return { prefix: '请选择', keyword: '正确', suffix: '的释义', color: theme.colors.success };
    } else {
      return { prefix: '请选出', keyword: '错误', suffix: '的释义', color: theme.colors.error };
    }
  }, [quizType, theme.colors.success, theme.colors.error]);

  // 判断选项是否是正确答案
  const isCorrectAnswer = useCallback((option: { text: string; isCorrect: boolean }) => {
    if (quizType === 'select_correct') {
      // 选正确：正确选项就是答案
      return option.isCorrect;
    } else {
      // 选错误：错误选项就是答案
      return !option.isCorrect;
    }
  }, [quizType]);

  // 选择选项
  const handleSelect = useCallback((index: number) => {
    if (disabled || result !== null) return;

    setSelectedIndex(index);
    const option = options[index];
    const isCorrect = isCorrectAnswer(option);

    setResult(isCorrect ? 'correct' : 'wrong');
    onResult(isCorrect);

    if (!isCorrect) {
      // 错误时抖动动画
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
    }
  }, [disabled, result, options, isCorrectAnswer, onResult, shakeAnim]);

  // 获取选项样式
  const getOptionStyle = useCallback((index: number, option: { text: string; isCorrect: boolean }) => {
    if (result === null) {
      // 未答题
      return selectedIndex === index ? styles.optionSelected : styles.option;
    }

    const isAnswer = isCorrectAnswer(option);
    const isSelected = selectedIndex === index;

    if (isAnswer) {
      // 正确答案，显示绿色
      return [styles.option, styles.optionCorrect];
    } else if (isSelected) {
      // 选错了，显示红色
      return [styles.option, styles.optionWrong];
    }

    return styles.option;
  }, [result, selectedIndex, isCorrectAnswer, styles]);

  // 获取选项文字样式
  const getOptionTextStyle = useCallback((index: number, option: { text: string; isCorrect: boolean }) => {
    if (result === null) {
      return styles.optionText;
    }

    const isAnswer = isCorrectAnswer(option);
    const isSelected = selectedIndex === index;

    if (isAnswer) {
      return [styles.optionText, styles.optionTextCorrect];
    } else if (isSelected) {
      return [styles.optionText, styles.optionTextWrong];
    }

    return styles.optionText;
  }, [result, selectedIndex, isCorrectAnswer, styles]);

  return (
    <View style={styles.container}>
      {/* 单词 */}
      <Text style={styles.wordText}>{word}</Text>

      {/* 题目 */}
      <Text style={styles.questionText}>
        {keywordInfo.prefix}
        <Text style={[styles.questionKeyword, { color: keywordInfo.color }]}>{keywordInfo.keyword}</Text>
        {keywordInfo.suffix}
      </Text>

      {/* 选项列表 */}
      <Animated.View
        style={[
          styles.optionsContainer,
          { transform: [{ translateX: shakeAnim }] },
        ]}
      >
        {options.map((option, index) => (
          <TouchableOpacity
            key={index}
            style={getOptionStyle(index, option)}
            onPress={() => handleSelect(index)}
            disabled={disabled || result !== null}
            activeOpacity={0.7}
          >
            <Text style={getOptionTextStyle(index, option)} numberOfLines={2}>
              {option.text}
            </Text>
            {result !== null && isCorrectAnswer(option) && (
              <Icon name="check-circle" size={20} color={theme.colors.success} />
            )}
            {result !== null && selectedIndex === index && !isCorrectAnswer(option) && (
              <Icon name="cancel" size={20} color={theme.colors.error} />
            )}
          </TouchableOpacity>
        ))}
      </Animated.View>

    </View>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
  },
  wordText: {
    fontSize: 36,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: 12,
  },
  questionText: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    marginBottom: 24,
  },
  questionKeyword: {
    fontWeight: '700',
  },
  optionsContainer: {
    width: '100%',
    gap: 12,
  },
  option: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.background.secondary,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: theme.spacing.borderRadius.base,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionSelected: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.background.secondary,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: theme.spacing.borderRadius.base,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  optionCorrect: {
    backgroundColor: `${theme.colors.success}15`,
    borderColor: theme.colors.success,
  },
  optionWrong: {
    backgroundColor: `${theme.colors.error}15`,
    borderColor: theme.colors.error,
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text.primary,
    marginRight: 12,
  },
  optionTextCorrect: {
    color: theme.colors.success,
    fontWeight: '600',
  },
  optionTextWrong: {
    color: theme.colors.error,
  },
});
