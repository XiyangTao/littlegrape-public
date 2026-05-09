import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import Icon from '@/components/Icon';
import { useTTS } from '@/hooks/useTTS';
import { usePronunciationAssessment } from '@/hooks/usePronunciationAssessment';
import { useI18n } from '@/context/I18nProvider';
import type { DialogueSpeakingQuestion } from '@/api/modules/exercise';

interface Props {
  question: DialogueSpeakingQuestion;
  isAnswered: boolean;
  onAnswer: (correct: boolean) => void;
  styles: any;
  theme: any;
}

interface LineScore {
  lineIndex: number;
  score: number;
}

export default function DialogueSpeakingView({ question, isAnswered, onAnswer, styles, theme }: Props) {
  const { t } = useI18n();
  const [currentLine, setCurrentLine] = useState(0);
  const [lineScores, setLineScores] = useState<LineScore[]>([]);
  const [hasLineResult, setHasLineResult] = useState(false);
  const tts = useTTS();

  const currentLineData = question.lines[currentLine];
  const isUserLine = currentLineData?.speaker === 'user';

  // 用 ref 跟踪最新值，避免 useEffect/setTimeout 闭包陷阱
  const stateRef = useRef({ currentLine, lineScores, isUserLine });
  stateRef.current = { currentLine, lineScores, isUserLine };

  const pronunciation = usePronunciationAssessment();

  const advanceLine = useCallback(() => {
    const { currentLine: line, lineScores: scores, isUserLine: isUser } = stateRef.current;
    const nextLine = line + 1;
    if (nextLine >= question.lines.length) {
      // 全部完成
      const userScores = scores.filter(s =>
        question.lines[s.lineIndex]?.speaker === 'user'
      );
      // 加上当前行的分（如果是 user 行刚完成）
      const allScores = [...userScores];
      if (pronunciation.result && isUser) {
        allScores.push({ lineIndex: line, score: pronunciation.result.pronunciationScore ?? 0 });
      }
      const avgScore = allScores.length > 0
        ? allScores.reduce((sum, s) => sum + s.score, 0) / allScores.length
        : 0;
      onAnswer(avgScore >= 60);
    } else {
      setCurrentLine(nextLine);
      setHasLineResult(false);
      pronunciation.reset();
    }
  }, [question.lines, pronunciation, onAnswer]);

  // 自动播放 AI 行
  useEffect(() => {
    if (currentLineData && currentLineData.speaker === 'ai' && !isAnswered) {
      tts.speak(`ds_${question.id}_${currentLine}`, currentLineData.text, 'en-US-JennyNeural');
    }
  }, [currentLine, question.id, currentLineData, isAnswered]);

  // AI 行播放完后自动下一行
  useEffect(() => {
    if (currentLineData?.speaker === 'ai' && !tts.isPlaying && !tts.isLoading && currentLine > 0) {
      const timer = setTimeout(() => advanceLine(), 800);
      return () => clearTimeout(timer);
    }
  }, [tts.isPlaying, tts.isLoading, currentLineData, currentLine, advanceLine]);

  // 用户行录音完成
  useEffect(() => {
    if (pronunciation.result && !hasLineResult && isUserLine) {
      setHasLineResult(true);
      const score = pronunciation.result.pronunciationScore ?? 0;
      setLineScores(prev => [...prev, { lineIndex: currentLine, score }]);

      // 延迟后进入下一行
      setTimeout(() => advanceLine(), 1500);
    }
  }, [pronunciation.result, hasLineResult, isUserLine, currentLine, advanceLine]);

  const handleToggleRecord = async () => {
    if (pronunciation.isRecording || pronunciation.isAssessing) {
      pronunciation.stop();
    } else {
      pronunciation.reset();
      setHasLineResult(false);
      pronunciation.start({
        referenceText: currentLineData.text,
        language: 'en-US',
        granularity: 'word',
        enableProsody: true,
        enableMiscue: true,
        maxDuration: 15000,
      });
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return theme.colors.success;
    if (score >= 60) return theme.colors.warning;
    return theme.colors.error;
  };

  return (
    <View>
      <Text style={styles.questionType}>{question.title}</Text>

      {/* 对话历史 */}
      <View style={{ marginBottom: 16 }}>
        {question.lines.map((line, i) => {
          const isAi = line.speaker === 'ai';
          const isPast = i < currentLine;
          const isCurrent = i === currentLine;
          const isFuture = i > currentLine;
          const lineScore = lineScores.find(s => s.lineIndex === i);

          return (
            <View key={i} style={{
              flexDirection: 'row',
              justifyContent: isAi ? 'flex-start' : 'flex-end',
              marginBottom: 8,
              opacity: isFuture ? 0.3 : 1,
            }}>
              <View style={{
                maxWidth: '80%',
                backgroundColor: isAi ? theme.colors.background.secondary : (theme.colors.primary + '15'),
                borderRadius: theme.spacing.borderRadius.md,
                padding: 12,
                borderWidth: isCurrent ? 2 : 0,
                borderColor: theme.colors.primary,
              }}>
                <Text style={{ fontSize: 12, color: theme.colors.text.tertiary, marginBottom: 4 }}>
                  {isAi ? t('exercise.dialogue.otherSide') : t('exercise.dialogue.you')}
                </Text>
                <Text style={{ color: theme.colors.text.primary, fontSize: 15, lineHeight: 22 }}>
                  {isFuture ? '...' : line.text}
                </Text>
                {isPast && !isAi && line.textCn && (
                  <Text style={{ color: theme.colors.text.tertiary, fontSize: 12, marginTop: 4 }}>
                    {line.textCn}
                  </Text>
                )}
                {lineScore && (
                  <Text style={{ color: getScoreColor(lineScore.score), fontSize: 12, fontWeight: '600', marginTop: 4 }}>
                    {lineScore.score}{t('exercise.flashcard.scoreUnit')}
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </View>

      {/* 当前用户行录音 */}
      {!isAnswered && isUserLine && (
        <>
          <TouchableOpacity
            style={[
              styles.recordButton,
              (pronunciation.isRecording || pronunciation.isAssessing) && styles.recordButtonActive,
            ]}
            onPress={handleToggleRecord}
            activeOpacity={0.7}
          >
            <Icon
              name={pronunciation.isRecording ? 'stop' : pronunciation.isAssessing ? 'hourglass-top' : 'mic'}
              size={32}
              color={pronunciation.isRecording || pronunciation.isAssessing ? theme.colors.text.inverse : theme.colors.error}
            />
          </TouchableOpacity>
          <Text style={{ textAlign: 'center', color: theme.colors.text.tertiary, fontSize: 13 }}>
            {pronunciation.isRecording ? t('exercise.flashcard.recording') :
             pronunciation.isAssessing ? t('exercise.flashcard.assessing') : t('exercise.dialogue.tapToRead')}
          </Text>
        </>
      )}

      {/* 最终总分 */}
      {isAnswered && (
        <View style={{ alignItems: 'center', marginTop: 16 }}>
          {(() => {
            const scores = lineScores.filter(s => question.lines[s.lineIndex]?.speaker === 'user');
            const avg = scores.length > 0 ? Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length) : 0;
            return (
              <View style={[styles.scoreCircle, { borderColor: getScoreColor(avg) }]}>
                <Text style={[styles.scoreText, { color: getScoreColor(avg) }]}>{avg}</Text>
                <Text style={styles.scoreLabel}>{t('exercise.dialogue.avgScore')}</Text>
              </View>
            );
          })()}
        </View>
      )}
    </View>
  );
}
