import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Icon from '@/components/Icon';
import { useI18n } from '@/context/I18nProvider';
import type { LessonQuestion, TableBlank } from '@/api/modules/grammar';

interface Props {
  question: LessonQuestion;
  selectedAnswer: string | null;
  isAnswered: boolean;
  isCorrect: boolean;
  onSelect: (answer: string) => void;
  styles: any;
  theme: any;
}

export default function TableFillQuiz({
  question, selectedAnswer, isAnswered, isCorrect, onSelect, styles, theme,
}: Props) {
  const { t } = useI18n();
  const tableData = question.tableData;
  const blanks = tableData?.blanks || [];

  const [activeBlankIdx, setActiveBlankIdx] = useState(0);
  const [filledAnswers, setFilledAnswers] = useState<Record<number, string>>({});

  if (!tableData) return null;

  const activeBlank = blanks[activeBlankIdx];

  const handleOptionPress = (option: string) => {
    if (isAnswered) return;

    const newFilled = { ...filledAnswers, [activeBlankIdx]: option };
    setFilledAnswers(newFilled);

    // 如果还有下一个空，切换到下一个
    if (activeBlankIdx < blanks.length - 1) {
      setActiveBlankIdx(activeBlankIdx + 1);
    } else {
      // 所有空都填完，提交
      const combined = blanks.map((_, i) => newFilled[i] || '').join(',');
      onSelect(combined);
    }
  };

  const handleBlankPress = (idx: number) => {
    if (isAnswered) return;
    setActiveBlankIdx(idx);
  };

  const isBlankCell = (row: number, col: number) => {
    return blanks.some(b => b.row === row && b.col === col);
  };

  const getBlankForCell = (row: number, col: number): { blank: TableBlank; idx: number } | null => {
    const idx = blanks.findIndex(b => b.row === row && b.col === col);
    if (idx === -1) return null;
    return { blank: blanks[idx], idx };
  };

  return (
    <View>
      <Text style={styles.questionType}>{t('learn.completeTable')}</Text>
      {question.question ? (
        <Text style={styles.questionText}>{question.question}</Text>
      ) : null}

      {/* 表格 */}
      <View style={styles.tableContainer}>
        {/* 表头 */}
        <View style={[styles.tableRow, styles.tableHeaderRow]}>
          {tableData.headers.map((header, i) => (
            <View
              key={i}
              style={[styles.tableCell, i === tableData.headers.length - 1 && styles.tableCellLast]}
            >
              <Text style={styles.tableHeaderText}>{header}</Text>
            </View>
          ))}
        </View>

        {/* 数据行 */}
        {tableData.rows.map((row, rowIdx) => (
          <View key={rowIdx} style={styles.tableRow}>
            {row.map((cell, colIdx) => {
              const blankInfo = getBlankForCell(rowIdx, colIdx);
              const isLast = colIdx === row.length - 1;

              if (blankInfo) {
                const { blank, idx } = blankInfo;
                const value = filledAnswers[idx];
                const isActive = activeBlankIdx === idx && !isAnswered;
                const blankCorrect = isAnswered && value === blank.answer;
                const blankIncorrect = isAnswered && value !== blank.answer;

                return (
                  <View key={colIdx} style={[styles.tableCell, isLast && styles.tableCellLast]}>
                    <TouchableOpacity
                      style={[
                        styles.tableBlankCell,
                        isActive && styles.tableBlankCellActive,
                        blankCorrect && styles.tableBlankCellCorrect,
                        blankIncorrect && styles.tableBlankCellIncorrect,
                      ]}
                      onPress={() => handleBlankPress(idx)}
                      disabled={isAnswered}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.tableBlankText,
                        blankCorrect && { color: theme.colors.success },
                        blankIncorrect && { color: theme.colors.error },
                      ]}>
                        {value || '___'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              }

              return (
                <View key={colIdx} style={[styles.tableCell, isLast && styles.tableCellLast]}>
                  <Text style={styles.tableCellText}>{cell}</Text>
                </View>
              );
            })}
          </View>
        ))}
      </View>

      {/* 当前空的选项 */}
      {!isAnswered && activeBlank && (
        <View style={styles.wordBankContainer}>
          {activeBlank.options.map((option) => (
            <TouchableOpacity
              key={option}
              style={styles.wordChip}
              onPress={() => handleOptionPress(option)}
              activeOpacity={0.7}
            >
              <Text style={styles.wordChipText}>{option}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* 解析 */}
      {isAnswered && (
        <View style={styles.explanationCard}>
          <View style={styles.explanationTitle}>
            <Icon
              name={isCorrect ? 'check-circle' : 'cancel'}
              size={18}
              color={isCorrect ? theme.colors.success : theme.colors.error}
            />
            <Text style={styles.explanationTitleText}>
              {isCorrect ? t('learn.correct') : t('learn.incorrect')}
            </Text>
          </View>
          {!isCorrect && (
            <Text style={styles.correctAnswer}>
              {blanks.map(b => b.answer).join(', ')}
            </Text>
          )}
          <Text style={styles.explanationText}>{question.explanation}</Text>
        </View>
      )}
    </View>
  );
}
