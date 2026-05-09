import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Icon from '@/components/Icon';
import { useTTS } from '@/hooks/useTTS';
import type { StoryQuestion, StoryDialogueElement, StoryExerciseElement } from '@/api/modules/exercise';

interface Props {
  question: StoryQuestion;
  isAnswered: boolean;
  onAnswer: (correct: boolean) => void;
  styles: any;
  theme: any;
}

export default function StoryView({ question, isAnswered, onAnswer, styles, theme }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [exerciseAnswers, setExerciseAnswers] = useState<Record<number, string | boolean | null>>({});
  const [exerciseResults, setExerciseResults] = useState<Record<number, boolean>>({});
  const tts = useTTS();

  const visibleElements = question.storyElements.slice(0, currentIndex + 1);
  const currentElement = question.storyElements[currentIndex];
  const isLastElement = currentIndex >= question.storyElements.length - 1;

  const handleAdvance = () => {
    if (isLastElement) {
      // 计算总分
      const exerciseIndices = question.storyElements
        .map((el, i) => el.elementType === 'exercise' ? i : -1)
        .filter(i => i >= 0);
      const totalExercises = exerciseIndices.length;
      const correctCount = exerciseIndices.filter(i => exerciseResults[i]).length;
      onAnswer(totalExercises === 0 || correctCount >= Math.ceil(totalExercises / 2));
    } else {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleExerciseAnswer = (elementIndex: number, answer: string | boolean) => {
    if (exerciseAnswers[elementIndex] !== undefined && exerciseAnswers[elementIndex] !== null) return;

    const el = question.storyElements[elementIndex] as StoryExerciseElement;
    const isCorrect = answer === el.answer ||
      (typeof el.answer === 'string' && typeof answer === 'string' && answer.toLowerCase() === el.answer.toLowerCase());

    setExerciseAnswers(prev => ({ ...prev, [elementIndex]: answer }));
    setExerciseResults(prev => ({ ...prev, [elementIndex]: isCorrect }));
  };

  const renderDialogue = (el: StoryDialogueElement, index: number) => (
    <View key={index} style={{
      flexDirection: 'row',
      marginBottom: 10,
      paddingHorizontal: 4,
    }}>
      <Text style={{
        fontWeight: '700',
        color: theme.colors.primary,
        fontSize: 14,
        width: 70,
      }}>
        {el.speaker}:
      </Text>
      <View style={{
        flex: 1,
        backgroundColor: theme.colors.background.secondary,
        borderRadius: theme.spacing.borderRadius.base,
        padding: 12,
      }}>
        <Text style={{ color: theme.colors.text.primary, fontSize: 15, lineHeight: 22 }}>
          {el.text}
        </Text>
        {el.textCn && (
          <Text style={{ color: theme.colors.text.tertiary, fontSize: 12, marginTop: 4 }}>
            {el.textCn}
          </Text>
        )}
        <TouchableOpacity
          onPress={() => tts.speak(`st_${question.id}_${index}`, el.text, 'en-US-JennyNeural')}
          style={{ marginTop: 6 }}
          activeOpacity={0.7}
        >
          <Icon name="volume-up" size={16} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderExercise = (el: StoryExerciseElement, index: number) => {
    const answered = exerciseAnswers[index] !== undefined && exerciseAnswers[index] !== null;
    const userAnswer = exerciseAnswers[index];
    const isCorrect = exerciseResults[index];

    return (
      <View key={index} style={{
        backgroundColor: theme.colors.primary + '08',
        borderRadius: theme.spacing.borderRadius.base,
        padding: 14,
        marginBottom: 10,
        borderLeftWidth: 3,
        borderLeftColor: answered ? (isCorrect ? theme.colors.success : theme.colors.error) : theme.colors.primary,
      }}>
        <Text style={{ color: theme.colors.text.primary, fontSize: 14, fontWeight: '600', marginBottom: 10 }}>
          {el.question}
        </Text>

        {el.exerciseType === 'true_false' ? (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {[true, false].map((val) => {
              const isSelected = userAnswer === val;
              const isCorrectOption = el.answer === val;
              return (
                <TouchableOpacity
                  key={String(val)}
                  style={{
                    flex: 1,
                    padding: 12,
                    borderRadius: theme.spacing.borderRadius.sm,
                    alignItems: 'center',
                    backgroundColor: answered
                      ? (isCorrectOption ? theme.colors.success + '15' : isSelected ? theme.colors.error + '15' : theme.colors.card)
                      : theme.colors.card,
                    borderWidth: 2,
                    borderColor: answered
                      ? (isCorrectOption ? theme.colors.success : isSelected ? theme.colors.error : theme.colors.border.light)
                      : theme.colors.border.light,
                  }}
                  onPress={() => handleExerciseAnswer(index, val)}
                  disabled={answered}
                  activeOpacity={0.7}
                >
                  <Text style={{ color: theme.colors.text.primary, fontWeight: '600' }}>
                    {val ? 'True' : 'False'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          el.options?.map((option) => {
            const isSelected = userAnswer === option;
            const isCorrectOption = option === el.answer;

            return (
              <TouchableOpacity
                key={option}
                style={{
                  padding: 12,
                  borderRadius: 10,
                  marginBottom: 6,
                  backgroundColor: answered
                    ? (isCorrectOption ? theme.colors.success + '10' : isSelected ? theme.colors.error + '10' : theme.colors.card)
                    : theme.colors.card,
                  borderWidth: 2,
                  borderColor: answered
                    ? (isCorrectOption ? theme.colors.success : isSelected ? theme.colors.error : theme.colors.border.light)
                    : theme.colors.border.light,
                }}
                onPress={() => handleExerciseAnswer(index, option)}
                disabled={answered}
                activeOpacity={0.7}
              >
                <Text style={{ color: theme.colors.text.primary, fontSize: 14 }}>{option}</Text>
              </TouchableOpacity>
            );
          })
        )}

        {answered && el.explanation && (
          <Text style={{ color: theme.colors.text.tertiary, fontSize: 12, marginTop: 8 }}>
            {el.explanation}
          </Text>
        )}
      </View>
    );
  };

  // 检查当前元素是否允许继续
  const canAdvance = () => {
    if (!currentElement) return false;
    if (currentElement.elementType === 'dialogue') return true;
    // exercise 类型需要先回答
    return exerciseAnswers[currentIndex] !== undefined && exerciseAnswers[currentIndex] !== null;
  };

  return (
    <View>
      <Text style={styles.questionType}>{question.title}</Text>

      {/* 进度条 */}
      <View style={{ height: 4, backgroundColor: theme.colors.border.light, borderRadius: 2, marginBottom: 16 }}>
        <View style={{
          height: 4,
          backgroundColor: theme.colors.primary,
          borderRadius: 2,
          width: `${((currentIndex + 1) / question.storyElements.length) * 100}%`,
        }} />
      </View>

      {/* 已展示的元素 */}
      {visibleElements.map((el, i) => {
        if (el.elementType === 'dialogue') return renderDialogue(el, i);
        return renderExercise(el, i);
      })}

      {/* 继续按钮 */}
      {!isAnswered && canAdvance() && (
        <TouchableOpacity
          style={{
            backgroundColor: theme.colors.primary,
            borderRadius: theme.spacing.borderRadius.base,
            paddingVertical: 14,
            alignItems: 'center',
            marginTop: 12,
          }}
          onPress={handleAdvance}
          activeOpacity={0.8}
        >
          <Text style={{ color: theme.colors.text.inverse, fontWeight: '600', fontSize: 15 }}>
            {isLastElement ? '完成故事' : '继续'}
          </Text>
        </TouchableOpacity>
      )}

      {/* 完成总结 */}
      {isAnswered && (
        <View style={{ alignItems: 'center', paddingVertical: 16 }}>
          <Icon name="auto-stories" size={40} color={theme.colors.primary} />
          <Text style={{ fontSize: 16, fontWeight: '600', color: theme.colors.text.primary, marginTop: 8 }}>
            故事完成！
          </Text>
          {(() => {
            const exerciseIndices = question.storyElements
              .map((el, i) => el.elementType === 'exercise' ? i : -1)
              .filter(i => i >= 0);
            const correctCount = exerciseIndices.filter(i => exerciseResults[i]).length;
            return exerciseIndices.length > 0 ? (
              <Text style={{ fontSize: 14, color: theme.colors.text.secondary, marginTop: 4 }}>
                练习答对 {correctCount}/{exerciseIndices.length} 题
              </Text>
            ) : null;
          })()}
        </View>
      )}
    </View>
  );
}
