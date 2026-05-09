/**
 * 单词拼图组件
 * 用户通过点击选择字母片段来拼出单词
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
import { useI18n } from '@/context/I18nProvider';
import Icon from '@/components/Icon';

interface WordPart {
  id: string;
  text: string;
  isDistractor: boolean;
}

interface WordPuzzleProps {
  /** 所有可选的字母片段（包含干扰项） */
  parts: WordPart[];
  /** 正确的单词片段（按顺序） */
  correctParts: string[];
  /** 拼写结果回调 */
  onResult: (isCorrect: boolean) => void;
  /** 是否禁用交互 */
  disabled?: boolean;
}

export function WordPuzzle({
  parts,
  correctParts,
  onResult,
  disabled = false,
}: WordPuzzleProps) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const styles = createStyles(theme);

  // 已选择的片段（按选择顺序）
  const [selectedParts, setSelectedParts] = useState<WordPart[]>([]);
  // 验证结果
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null);
  // 动画值
  const shakeAnim = useState(new Animated.Value(0))[0];

  // 计算当前拼出的单词
  const currentWord = useMemo(() => {
    return selectedParts.map(p => p.text).join('');
  }, [selectedParts]);

  // 正确的单词
  const correctWord = useMemo(() => {
    return correctParts.join('');
  }, [correctParts]);

  // 选择一个片段
  const handleSelectPart = useCallback((part: WordPart) => {
    if (disabled || result === 'correct') return;

    // 如果已经选择了，则取消选择
    const existingIndex = selectedParts.findIndex(p => p.id === part.id);
    if (existingIndex !== -1) {
      setSelectedParts(prev => prev.filter(p => p.id !== part.id));
      setResult(null);
      return;
    }

    // 添加到已选择列表
    setSelectedParts(prev => [...prev, part]);
    setResult(null);
  }, [selectedParts, disabled, result]);

  // 从答案区移除片段
  const handleRemovePart = useCallback((part: WordPart) => {
    if (disabled || result === 'correct') return;
    setSelectedParts(prev => prev.filter(p => p.id !== part.id));
    setResult(null);
  }, [disabled, result]);

  // 清空所有选择
  const handleClear = useCallback(() => {
    if (disabled || result === 'correct') return;
    setSelectedParts([]);
    setResult(null);
  }, [disabled, result]);

  // 验证答案
  const handleCheck = useCallback(() => {
    if (disabled || selectedParts.length === 0) return;

    const isCorrect = currentWord.toLowerCase() === correctWord.toLowerCase();
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
  }, [currentWord, correctWord, selectedParts, disabled, onResult, shakeAnim]);

  // 判断片段是否已被选择
  const isPartSelected = useCallback((part: WordPart) => {
    return selectedParts.some(p => p.id === part.id);
  }, [selectedParts]);

  return (
    <View style={styles.container}>
      {/* 答案区域 */}
      <Animated.View
        style={[
          styles.answerArea,
          result === 'correct' && styles.answerAreaCorrect,
          result === 'wrong' && styles.answerAreaWrong,
          { transform: [{ translateX: shakeAnim }] },
        ]}
      >
        {selectedParts.length === 0 ? (
          <Text style={styles.placeholder}>{t('wordPractice.tapFragments')}</Text>
        ) : (
          <View style={styles.answerParts}>
            {selectedParts.map((part, index) => (
              <TouchableOpacity
                key={part.id}
                style={[
                  styles.answerPart,
                  result === 'correct' && styles.answerPartCorrect,
                  result === 'wrong' && part.isDistractor && styles.answerPartDistractor,
                ]}
                onPress={() => handleRemovePart(part)}
                disabled={disabled || result === 'correct'}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.answerPartText,
                  result === 'correct' && styles.answerPartTextCorrect,
                ]}>
                  {part.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* 清空按钮 */}
        {selectedParts.length > 0 && result !== 'correct' && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClear}
            disabled={disabled}
          >
            <Icon name="close" size={18} color={theme.colors.text.tertiary} />
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* 结果提示 */}
      {result === 'correct' && (
        <View style={styles.resultBox}>
          <Icon name="check-circle" size={20} color={theme.colors.success} />
          <Text style={styles.resultTextCorrect}>{t('wordPractice.spellingCorrect')}</Text>
        </View>
      )}
      {result === 'wrong' && (
        <View style={styles.resultBox}>
          <Icon name="cancel" size={20} color={theme.colors.error} />
          <Text style={styles.resultTextWrong}>
            {t('wordPractice.correctAnswer', { answer: correctWord })}
          </Text>
        </View>
      )}

      {/* 可选片段区域 */}
      <View style={styles.partsArea}>
        {parts.map((part) => {
          const selected = isPartSelected(part);
          return (
            <TouchableOpacity
              key={part.id}
              style={[
                styles.partButton,
                selected && styles.partButtonSelected,
              ]}
              onPress={() => handleSelectPart(part)}
              disabled={disabled || result === 'correct'}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.partText,
                selected && styles.partTextSelected,
              ]}>
                {part.text}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 操作按钮 */}
      <View style={styles.actions}>
        {result === null && (
          <TouchableOpacity
            style={[
              styles.checkButton,
              selectedParts.length === 0 && styles.checkButtonDisabled,
            ]}
            onPress={handleCheck}
            disabled={disabled || selectedParts.length === 0}
            activeOpacity={0.8}
          >
            <Text style={styles.checkButtonText}>{t('wordPractice.checkSpelling')}</Text>
          </TouchableOpacity>
        )}

        {result === 'wrong' && (
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleClear}
            disabled={disabled}
            activeOpacity={0.7}
          >
            <Icon name="refresh" size={18} color={theme.colors.primary} />
            <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    width: '100%',
  },
  answerArea: {
    minHeight: 60,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.spacing.borderRadius.base,
    borderWidth: 2,
    borderColor: theme.colors.border.light,
    borderStyle: 'dashed',
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  answerAreaCorrect: {
    borderColor: theme.colors.success,
    borderStyle: 'solid',
    backgroundColor: `${theme.colors.success}10`,
  },
  answerAreaWrong: {
    borderColor: theme.colors.error,
    borderStyle: 'solid',
    backgroundColor: `${theme.colors.error}10`,
  },
  placeholder: {
    fontSize: 14,
    color: theme.colors.text.tertiary,
  },
  answerParts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    flex: 1,
  },
  answerPart: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.spacing.borderRadius.sm,
  },
  answerPartCorrect: {
    backgroundColor: theme.colors.success,
  },
  answerPartDistractor: {
    backgroundColor: theme.colors.error,
  },
  answerPartText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.inverse,
  },
  answerPartTextCorrect: {
    color: theme.colors.text.inverse,
  },
  clearButton: {
    width: 28,
    height: 28,
    borderRadius: theme.spacing.borderRadius.base,
    backgroundColor: theme.colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  resultBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  resultTextCorrect: {
    fontSize: 15,
    color: theme.colors.success,
    fontWeight: '500',
  },
  resultTextWrong: {
    fontSize: 15,
    color: theme.colors.error,
  },
  correctAnswer: {
    fontWeight: '600',
  },
  partsArea: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    marginBottom: 24,
  },
  partButton: {
    backgroundColor: theme.colors.background.secondary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: theme.spacing.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
  },
  partButtonSelected: {
    backgroundColor: theme.colors.background.tertiary,
    borderColor: theme.colors.text.tertiary,
    opacity: 0.5,
  },
  partText: {
    fontSize: 18,
    fontWeight: '500',
    color: theme.colors.text.primary,
  },
  partTextSelected: {
    color: theme.colors.text.tertiary,
  },
  actions: {
    alignItems: 'center',
    gap: 12,
  },
  checkButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: theme.spacing.borderRadius.xl,
    minWidth: 160,
    alignItems: 'center',
  },
  checkButtonDisabled: {
    backgroundColor: theme.colors.text.tertiary,
    opacity: 0.5,
  },
  checkButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.inverse,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryButtonText: {
    fontSize: 15,
    color: theme.colors.primary,
    fontWeight: '500',
  },
});
