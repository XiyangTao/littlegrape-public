import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import Icon from '@/components/Icon';
import { useTTS } from '@/hooks/useTTS';
import type { DuoRadioQuestion } from '@/api/modules/exercise';

interface Props {
  question: DuoRadioQuestion;
  isAnswered: boolean;
  onAnswer: (correct: boolean) => void;
  styles: any;
  theme: any;
}

export default function DuoRadioView({ question, isAnswered, onAnswer, styles, theme }: Props) {
  const [phase, setPhase] = useState<'listening' | 'answering'>('listening');
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<(string | null)[]>(
    new Array(question.comprehensionQuestions.length).fill(null)
  );
  const [showTranscript, setShowTranscript] = useState(false);
  const tts = useTTS();

  // 自动播放
  useEffect(() => {
    tts.speak(`dr_${question.id}`, question.transcript, 'en-US-GuyNeural');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.id, question.transcript]);

  // TTS 播完切换到答题阶段
  useEffect(() => {
    if (phase === 'listening' && !tts.isPlaying && !tts.isLoading) {
      const timer = setTimeout(() => setPhase('answering'), 800);
      return () => clearTimeout(timer);
    }
  }, [tts.isPlaying, tts.isLoading, phase]);

  const handleSelect = (option: string) => {
    if (isAnswered) return;
    const newAnswers = [...answers];
    newAnswers[currentQ] = option;
    setAnswers(newAnswers);

    // 自动跳到下一题或完成
    if (currentQ < question.comprehensionQuestions.length - 1) {
      setTimeout(() => setCurrentQ(currentQ + 1), 500);
    } else {
      // 计算正确率
      const correctCount = newAnswers.filter(
        (a, i) => a === question.comprehensionQuestions[i].answer
      ).length;
      onAnswer(correctCount >= Math.ceil(question.comprehensionQuestions.length / 2));
    }
  };

  const qItem = question.comprehensionQuestions[currentQ];

  return (
    <View>
      <Text style={styles.questionType}>{question.title}</Text>

      {/* 播放器 UI */}
      <View style={{
        backgroundColor: theme.colors.background.secondary,
        borderRadius: theme.spacing.borderRadius.md,
        padding: 20,
        marginBottom: 16,
        alignItems: 'center',
      }}>
        <TouchableOpacity
          onPress={() => tts.speak(`dr_${question.id}`, question.transcript, 'en-US-GuyNeural')}
          activeOpacity={0.7}
          style={{
            width: 64,
            height: 64,
            borderRadius: theme.spacing.borderRadius['2xl'],
            backgroundColor: theme.colors.primary + '20',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          <Icon
            name={tts.isPlaying ? 'pause' : 'play-arrow'}
            size={32}
            color={theme.colors.primary}
          />
        </TouchableOpacity>

        <Text style={{ color: theme.colors.text.secondary, fontSize: 13 }}>
          {tts.isPlaying ? '正在播放...' : phase === 'listening' ? '正在加载...' : '点击重新播放'}
        </Text>

        {/* 查看原文按钮 */}
        <TouchableOpacity
          onPress={() => setShowTranscript(!showTranscript)}
          style={{ marginTop: 12 }}
          activeOpacity={0.7}
        >
          <Text style={{ color: theme.colors.primary, fontSize: 13 }}>
            {showTranscript ? '隐藏原文' : '查看原文'}
          </Text>
        </TouchableOpacity>

        {showTranscript && (
          <View style={{ marginTop: 10 }}>
            <Text style={{ color: theme.colors.text.primary, fontSize: 14, lineHeight: 22 }}>
              {question.transcript}
            </Text>
            <Text style={{ color: theme.colors.text.tertiary, fontSize: 12, lineHeight: 20, marginTop: 6 }}>
              {question.transcriptCn}
            </Text>
          </View>
        )}
      </View>

      {/* 答题区域 */}
      {phase === 'answering' && (
        <View>
          {/* 进度 */}
          <Text style={{ color: theme.colors.text.tertiary, fontSize: 13, textAlign: 'center', marginBottom: 12 }}>
            问题 {currentQ + 1}/{question.comprehensionQuestions.length}
          </Text>

          {/* 问题 */}
          <Text style={{ color: theme.colors.text.primary, fontSize: 16, fontWeight: '600', marginBottom: 16 }}>
            {qItem.question}
          </Text>

          {/* 选项 */}
          {qItem.options.map((option) => {
            const isSelected = answers[currentQ] === option;
            const isCorrectOption = option === qItem.answer;

            let optionStyle = [styles.optionButton];
            if (isAnswered) {
              if (isCorrectOption) optionStyle.push(styles.optionCorrect);
              else if (isSelected) optionStyle.push(styles.optionIncorrect);
            } else if (isSelected) {
              optionStyle.push(styles.optionSelected);
            }

            return (
              <TouchableOpacity
                key={option}
                style={optionStyle}
                onPress={() => handleSelect(option)}
                activeOpacity={0.7}
                disabled={isAnswered || answers[currentQ] !== null}
              >
                <Text style={styles.optionText}>{option}</Text>
                {isAnswered && isCorrectOption && (
                  <Icon name="check-circle" size={20} color={theme.colors.success} style={styles.optionIcon} />
                )}
                {isAnswered && isSelected && !isCorrectOption && (
                  <Icon name="cancel" size={20} color={theme.colors.error} style={styles.optionIcon} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* 最终结果 */}
      {isAnswered && (
        <View style={{ alignItems: 'center', marginTop: 16 }}>
          {(() => {
            const correctCount = answers.filter(
              (a, i) => a === question.comprehensionQuestions[i].answer
            ).length;
            return (
              <Text style={{ fontSize: 14, color: theme.colors.text.secondary }}>
                答对 {correctCount}/{question.comprehensionQuestions.length} 题
              </Text>
            );
          })()}
        </View>
      )}
    </View>
  );
}
