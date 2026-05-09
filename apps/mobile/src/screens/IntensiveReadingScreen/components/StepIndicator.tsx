import React from 'react';
import { View, Text } from 'react-native';
import Icon from '@/components/Icon';
import { createStyles } from '../styles';
import { Theme } from '@/context/ThemeProvider';

interface StepIndicatorProps {
  currentStep: number;
  labels: string[];
  theme: Theme;
}

export function StepIndicator({ currentStep, labels, theme }: StepIndicatorProps) {
  const styles = createStyles(theme);

  return (
    <View style={styles.stepIndicator}>
      {labels.map((label, index) => {
        const isCompleted = index < currentStep;
        const isActive = index === currentStep;

        return (
          <React.Fragment key={index}>
            {index > 0 && (
              <View style={[styles.stepLine, isCompleted && styles.stepLineCompleted]} />
            )}
            <View>
              <View style={[
                styles.stepDot,
                isActive && styles.stepDotActive,
                isCompleted && styles.stepDotCompleted,
              ]}>
                {isCompleted ? (
                  <Icon name="check" size={14} color={theme.colors.text.inverse} />
                ) : (
                  <Text style={[
                    styles.stepDotText,
                    (isActive || isCompleted) && styles.stepDotTextActive,
                  ]}>
                    {index + 1}
                  </Text>
                )}
              </View>
              <Text style={[styles.stepLabel, isActive && styles.stepLabelActive]}>
                {label}
              </Text>
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );
}
