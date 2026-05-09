import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme, Theme } from '@/context/ThemeProvider';

interface Props {
  prompt: string;
  options: { text: string; correct: boolean }[];
  explanation: string;
  onAnswer: (correct: boolean) => void;
  disabled?: boolean;
}

export default function ChoiceQuestion({ prompt, options, explanation, onAnswer, disabled }: Props) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSelect = (index: number) => {
    if (submitted || disabled) return;
    setSelectedIndex(index);
  };

  const handleCheck = () => {
    if (selectedIndex === null) return;
    setSubmitted(true);
    const correct = options[selectedIndex].correct;
    setTimeout(() => onAnswer(correct), 1500);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.prompt}>{prompt}</Text>

      <View style={styles.options}>
        {options.map((option, index) => {
          let optionStyle = styles.option;
          let textStyle = styles.optionText;

          if (submitted) {
            if (option.correct) {
              optionStyle = { ...styles.option, ...styles.optionCorrect };
              textStyle = { ...styles.optionText, ...styles.optionTextCorrect };
            } else if (index === selectedIndex) {
              optionStyle = { ...styles.option, ...styles.optionWrong };
              textStyle = { ...styles.optionText, ...styles.optionTextWrong };
            }
          } else if (index === selectedIndex) {
            optionStyle = { ...styles.option, ...styles.optionSelected };
          }

          return (
            <TouchableOpacity
              key={index}
              style={optionStyle}
              onPress={() => handleSelect(index)}
              disabled={submitted}
            >
              <Text style={textStyle}>{option.text}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {submitted && (
        <View style={styles.explanationBox}>
          <Text style={styles.explanationText}>{explanation}</Text>
        </View>
      )}

      {!submitted && (
        <TouchableOpacity
          style={[styles.checkButton, selectedIndex === null && styles.checkButtonDisabled]}
          onPress={handleCheck}
          disabled={selectedIndex === null}
        >
          <Text style={styles.checkButtonText}>Check</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
    },
    prompt: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.md,
    },
    options: {
      gap: theme.spacing.sm,
    },
    option: {
      borderWidth: 2,
      borderColor: theme.colors.border.light,
      borderRadius: theme.spacing.borderRadius.base,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    optionSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primary + '10',
    },
    optionCorrect: {
      borderColor: '#34C759',
      backgroundColor: '#34C75915',
    },
    optionWrong: {
      borderColor: '#FF3B30',
      backgroundColor: '#FF3B3015',
    },
    optionText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text.primary,
    },
    optionTextCorrect: {
      color: '#34C759',
      fontWeight: theme.typography.fontWeight.semibold,
    },
    optionTextWrong: {
      color: '#FF3B30',
    },
    explanationBox: {
      marginTop: theme.spacing.md,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.background.secondary,
      borderRadius: theme.spacing.borderRadius.sm,
    },
    explanationText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.secondary,
      lineHeight: theme.typography.fontSize.sm * 1.5,
    },
    checkButton: {
      marginTop: theme.spacing.md,
      backgroundColor: theme.colors.primary,
      borderRadius: theme.spacing.borderRadius.base,
      paddingVertical: theme.spacing.sm,
      alignItems: 'center',
    },
    checkButtonDisabled: {
      opacity: 0.4,
    },
    checkButtonText: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: '#FFFFFF',
    },
  });
