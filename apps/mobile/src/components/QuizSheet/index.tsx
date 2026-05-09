import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  Modal,
  Animated,
  ScrollView,
} from 'react-native';
import { useTheme } from '@/context/ThemeProvider';
import Icon from '@/components/Icon';
import type { LearnWordWithProgress } from '@/types/word';
import { useQuizState } from './useQuizState';
import MatchingQuiz from './MatchingQuiz';
import MultipleChoiceQuiz from './MultipleChoiceQuiz';
import QuizResult from './QuizResult';
import { createStyles } from './styles';

interface QuizSheetProps {
  visible: boolean;
  words: LearnWordWithProgress[];
  onComplete: (correctCount: number, totalCount: number, correctWordIds: string[]) => void;
  onClose: () => void;
}

export default function QuizSheet({ visible, words, onComplete, onClose }: QuizSheetProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const {
    currentQuizType,
    quizCompleted,
    correctCount,
    totalCount,
    correctWordIds,
    matchingItems,
    selectedWordId,
    matchedPairs,
    wrongPair,
    shuffledMeanings,
    questions,
    currentQuestionIndex,
    selectedOptionIndex,
    showAnswer,
    initQuiz,
    handleWordPress,
    handleMeaningPress,
    handleOptionPress,
    handleNextQuestion,
  } = useQuizState(words);

  // 动画
  const slideAnimRef = useRef(new Animated.Value(theme.screen.height));
  const slideAnim = slideAnimRef.current;

  // 显示/隐藏动画
  useEffect(() => {
    if (visible) {
      initQuiz();
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 10,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: theme.screen.height,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  // 完成测试
  const handleComplete = useCallback(() => {
    onComplete(correctCount, totalCount, Array.from(correctWordIds));
  }, [onComplete, correctCount, totalCount, correctWordIds]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      presentationStyle="overFullScreen"
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.container,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* 顶部 */}
          <View style={styles.header}>
            <View style={styles.headerHandle} />
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Icon name="close" size={24} color={theme.colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {quizCompleted ? (
              <QuizResult
                theme={theme}
                correctCount={correctCount}
                totalCount={totalCount}
                onComplete={handleComplete}
              />
            ) : currentQuizType === 'matching' ? (
              <MatchingQuiz
                theme={theme}
                matchingItems={matchingItems}
                selectedWordId={selectedWordId}
                matchedPairs={matchedPairs}
                wrongPair={wrongPair}
                shuffledMeanings={shuffledMeanings}
                onWordPress={handleWordPress}
                onMeaningPress={handleMeaningPress}
              />
            ) : (
              <MultipleChoiceQuiz
                theme={theme}
                questions={questions}
                currentQuestionIndex={currentQuestionIndex}
                selectedOptionIndex={selectedOptionIndex}
                showAnswer={showAnswer}
                onOptionPress={handleOptionPress}
                onNextQuestion={handleNextQuestion}
              />
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}
