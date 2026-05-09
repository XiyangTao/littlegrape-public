/**
 * 义选词组件
 * 显示中文释义 + 词性，从 4 个英文单词中选正确的
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { useTheme, Theme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import Icon from '@/components/Icon';

interface WordSelectQuizProps {
  /** 中文释义 */
  meaningCn: string;
  /** 词性 */
  pos?: string;
  /** 正确的英文单词 */
  correctWord: string;
  /** 干扰英文单词 */
  distractorWords: string[];
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

export default function WordSelectQuiz({
  meaningCn,
  pos,
  correctWord,
  distractorWords,
  onResult,
  disabled = false,
}: WordSelectQuizProps) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const styles = createStyles(theme);

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null);
  const shakeAnim = useState(new Animated.Value(0))[0];

  // 生成选项列表（打乱顺序）
  const options = useMemo(() => {
    const allOptions = [
      { text: correctWord, isCorrect: true },
      ...distractorWords.map(w => ({ text: w, isCorrect: false })),
    ];
    return shuffleArray(allOptions);
  }, [correctWord, distractorWords]);

  // 选择选项
  const handleSelect = useCallback((index: number) => {
    if (disabled || result !== null) return;

    setSelectedIndex(index);
    const option = options[index];
    const isCorrect = option.isCorrect;

    setResult(isCorrect ? 'correct' : 'wrong');
    onResult(isCorrect);

    if (!isCorrect) {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
    }
  }, [disabled, result, options, onResult, shakeAnim]);

  // 获取选项样式
  const getOptionStyle = useCallback((index: number, option: { text: string; isCorrect: boolean }) => {
    if (result === null) {
      return selectedIndex === index ? styles.optionSelected : styles.option;
    }

    if (option.isCorrect) {
      return [styles.option, styles.optionCorrect];
    } else if (selectedIndex === index) {
      return [styles.option, styles.optionWrong];
    }

    return styles.option;
  }, [result, selectedIndex, styles]);

  // 获取选项文字样式
  const getOptionTextStyle = useCallback((index: number, option: { text: string; isCorrect: boolean }) => {
    if (result === null) {
      return styles.optionText;
    }

    if (option.isCorrect) {
      return [styles.optionText, styles.optionTextCorrect];
    } else if (selectedIndex === index) {
      return [styles.optionText, styles.optionTextWrong];
    }

    return styles.optionText;
  }, [result, selectedIndex, styles]);

  return (
    <View style={styles.container}>
      {/* 词性提示 */}
      {pos && <Text style={styles.posText}>{pos}.</Text>}

      {/* 中文释义 */}
      <Text style={styles.meaningText}>{meaningCn}</Text>

      {/* 题目提示 */}
      <Text style={styles.questionText}>{t('wordPractice.selectWord')}</Text>

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
            <Text style={getOptionTextStyle(index, option)} numberOfLines={1}>
              {option.text}
            </Text>
            {result !== null && option.isCorrect && (
              <Icon name="check-circle" size={20} color={theme.colors.success} />
            )}
            {result !== null && selectedIndex === index && !option.isCorrect && (
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
  posText: {
    fontSize: 14,
    color: theme.colors.text.tertiary,
    marginBottom: 4,
    fontStyle: 'italic',
  },
  meaningText: {
    fontSize: 32,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: 12,
    textAlign: 'center',
  },
  questionText: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    marginBottom: 24,
  },
  questionKeyword: {
    fontWeight: '700',
    color: theme.colors.success,
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
    fontSize: 18,
    fontWeight: '500',
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
