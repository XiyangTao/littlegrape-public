import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, Theme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import { getScoreColor, getScoreLabel } from '@/utils/wordStatus';
import type { WordAssessmentResult, PronunciationAssessmentResult } from '@/hooks/usePronunciationAssessment';

// ============================================================================
// 类型定义
// ============================================================================

interface PronunciationFeedbackProps {
  /** 评估结果 */
  result: PronunciationAssessmentResult;
  /** 显示模式: word=单词模式, sentence=句子模式 */
  mode?: 'word' | 'sentence';
  /** 是否显示详细音素（仅单词模式有效） */
  showPhonemes?: boolean;
}

interface WordFeedbackProps {
  word: WordAssessmentResult;
  showPhonemes?: boolean;
  showScore?: boolean;
  theme: Theme;
}


// ============================================================================
// 单词反馈组件（带音素详情）
// ============================================================================

const WordFeedback: React.FC<WordFeedbackProps> = ({
  word,
  showPhonemes = false,
  showScore = false,
  theme,
}) => {
  const { t } = useI18n();
  const styles = createStyles(theme);
  const scoreColor = getScoreColor(word.accuracyScore, theme);

  return (
    <View style={styles.wordContainer}>
      {/* 单词文本 */}
      <Text style={[styles.wordText, { color: scoreColor }]}>
        {word.word}
      </Text>

      {/* 分数 */}
      {showScore && (
        <Text style={[styles.scoreText, { color: scoreColor }]}>
          {Math.round(word.accuracyScore)}
        </Text>
      )}

      {/* 错误类型提示 */}
      {word.errorType !== 'None' && (
        <Text style={[styles.errorText, { color: theme.colors.pronunciation.poor }]}>
          {t(`pronunciationFeedback.errorType.${word.errorType}`)}
        </Text>
      )}

      {/* 音素详情 */}
      {showPhonemes && word.phonemes && word.phonemes.length > 0 && (
        <View style={styles.phonemesContainer}>
          {word.phonemes.map((phoneme, index) => (
            <View key={index} style={styles.phonemeItem}>
              <Text
                style={[
                  styles.phonemeText,
                  { color: getScoreColor(phoneme.accuracyScore, theme) }
                ]}
              >
                /{phoneme.phoneme}/
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

// ============================================================================
// 分数进度条组件
// ============================================================================

interface ScoreBarProps {
  label: string;
  score: number;
}

const ScoreBar: React.FC<ScoreBarProps> = ({ label, score }) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const scoreColor = getScoreColor(score, theme);
  const progressWidth = `${Math.min(100, Math.max(0, score))}%`;

  return (
    <View style={styles.scoreBarContainer}>
      <View style={styles.scoreBarHeader}>
        <Text style={[styles.scoreBarLabel, { color: theme.colors.text.secondary }]}>
          {label}
        </Text>
        <Text style={[styles.scoreBarValue, { color: scoreColor }]}>
          {Math.round(score)}%
        </Text>
      </View>
      <View style={[styles.scoreBarTrack, { backgroundColor: theme.colors.background.tertiary || '#E5E7EB' }]}>
        <View
          style={[
            styles.scoreBarFill,
            {
              backgroundColor: scoreColor,
              width: progressWidth as any,
            }
          ]}
        />
      </View>
    </View>
  );
};

// ============================================================================
// 单词模式反馈组件
// ============================================================================

interface WordModeFeedbackProps {
  result: PronunciationAssessmentResult;
  showPhonemes?: boolean;
}

const WordModeFeedback: React.FC<WordModeFeedbackProps> = ({ result, showPhonemes = true }) => {
  const { theme } = useTheme();
  const { t } = useI18n();
  const styles = createStyles(theme);

  // 单词模式：主要看准确度分数
  const mainScore = result.accuracyScore;
  const mainColor = getScoreColor(mainScore, theme);

  return (
    <View style={styles.container}>
      {/* 总分显示 - 使用准确度分数 */}
      <View style={styles.overallScoreContainer}>
        <Text style={[styles.overallScoreValue, { color: mainColor }]}>
          {Math.round(mainScore)}
        </Text>
        <Text style={[styles.overallScoreLabel, { color: theme.colors.text.secondary }]}>
          {t('pronunciationFeedback.accuracy')} · {getScoreLabel(mainScore)}
        </Text>
      </View>

      {/* 音素详情（单词模式的核心反馈） */}
      {result.words.length > 0 && result.words[0].phonemes && result.words[0].phonemes.length > 0 && showPhonemes && (
        <View style={[styles.phonemeSection, { backgroundColor: theme.colors.background.secondary }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
            {t('pronunciationFeedback.phonemeDetails')}
          </Text>
          <View style={styles.phonemeGrid}>
            {result.words[0].phonemes.map((phoneme, index) => {
              const phonemeColor = getScoreColor(phoneme.accuracyScore, theme);
              return (
                <View key={index} style={styles.phonemeCard}>
                  <Text style={[styles.phonemeSymbol, { color: phonemeColor }]}>
                    /{phoneme.phoneme}/
                  </Text>
                  <Text style={[styles.phonemeScore, { color: phonemeColor }]}>
                    {Math.round(phoneme.accuracyScore)}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* 识别的文本 */}
      <View style={[styles.recognizedSection, { backgroundColor: theme.colors.background.secondary }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
          {t('pronunciationFeedback.recognitionResult')}
        </Text>
        <Text style={[styles.recognizedText, { color: result.recognizedText ? theme.colors.text.secondary : theme.colors.text.tertiary }]}>
          {result.recognizedText || t('pronunciationFeedback.noSpeechDetected')}
        </Text>
      </View>
    </View>
  );
};

// ============================================================================
// 句子模式反馈组件
// ============================================================================

interface SentenceModeFeedbackProps {
  result: PronunciationAssessmentResult;
}

const SentenceModeFeedback: React.FC<SentenceModeFeedbackProps> = ({ result }) => {
  const { theme } = useTheme();
  const { t } = useI18n();
  const styles = createStyles(theme);

  // 句子模式：使用综合发音分数
  const overallScore = result.pronunciationScore;
  const overallColor = getScoreColor(overallScore, theme);

  return (
    <View style={styles.container}>
      {/* 总分显示 */}
      <View style={styles.overallScoreContainer}>
        <Text style={[styles.overallScoreValue, { color: overallColor }]}>
          {Math.round(overallScore)}
        </Text>
        <Text style={[styles.overallScoreLabel, { color: theme.colors.text.secondary }]}>
          {t('pronunciationFeedback.overallScore')} · {getScoreLabel(overallScore)}
        </Text>
      </View>

      {/* 详细分数（句子模式显示所有维度） */}
      <View style={[styles.scoreSection, { backgroundColor: theme.colors.background.secondary }]}>
        <ScoreBar label={t('pronunciationFeedback.accuracy')} score={result.accuracyScore} />
        <ScoreBar label={t('pronunciationFeedback.fluency')} score={result.fluencyScore} />
        <ScoreBar label={t('pronunciationFeedback.completeness')} score={result.completenessScore} />
        {result.prosodyScore !== undefined && (
          <ScoreBar label={t('pronunciationFeedback.prosody')} score={result.prosodyScore} />
        )}
      </View>

      {/* 逐词反馈 */}
      {result.words.length > 0 && (
        <View style={[styles.wordsSection, { backgroundColor: theme.colors.background.secondary }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
            {t('pronunciationFeedback.wordAssessment')}
          </Text>
          <View style={styles.wordsContainer}>
            {result.words.map((word, index) => (
              <WordFeedback
                key={index}
                word={word}
                showPhonemes={false}
                showScore={false}
                theme={theme}
              />
            ))}
          </View>
        </View>
      )}

      {/* 识别的文本 */}
      <View style={[styles.recognizedSection, { backgroundColor: theme.colors.background.secondary }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
          {t('pronunciationFeedback.recognitionResult')}
        </Text>
        <Text style={[styles.recognizedText, { color: result.recognizedText ? theme.colors.text.secondary : theme.colors.text.tertiary }]}>
          {result.recognizedText || t('pronunciationFeedback.noSpeechDetected')}
        </Text>
      </View>
    </View>
  );
};

// ============================================================================
// 主组件
// ============================================================================

export const PronunciationFeedback: React.FC<PronunciationFeedbackProps> = ({
  result,
  mode = 'word',
  showPhonemes = true,
}) => {
  if (mode === 'word') {
    return <WordModeFeedback result={result} showPhonemes={showPhonemes} />;
  }
  return <SentenceModeFeedback result={result} />;
};

// ============================================================================
// 简化版反馈组件（只显示单词色彩，用于内联显示）
// ============================================================================

interface SimpleWordFeedbackProps {
  words: WordAssessmentResult[];
}

export const SimpleWordFeedback: React.FC<SimpleWordFeedbackProps> = ({ words }) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  return (
    <View style={styles.simpleWordsContainer}>
      {words.map((word, index) => (
        <Text
          key={index}
          style={[
            styles.simpleWordText,
            { color: getScoreColor(word.accuracyScore, theme) }
          ]}
        >
          {word.word}{' '}
        </Text>
      ))}
    </View>
  );
};

// ============================================================================
// 样式
// ============================================================================

const createStyles = (_theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
  },

  // 总分
  overallScoreContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  overallScoreValue: {
    fontSize: 56,
    fontWeight: 'bold',
  },
  overallScoreLabel: {
    fontSize: 16,
    marginTop: 4,
  },

  // 分数区域
  scoreSection: {
    padding: 16,
    borderRadius: _theme.spacing.borderRadius.base,
    marginBottom: 12,
  },
  scoreBarContainer: {
    marginBottom: 12,
  },
  scoreBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  scoreBarLabel: {
    fontSize: 14,
  },
  scoreBarValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  scoreBarTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 4,
  },

  // 音素区域（单词模式）
  phonemeSection: {
    padding: 16,
    borderRadius: _theme.spacing.borderRadius.base,
    marginBottom: 12,
  },
  phonemeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  phonemeCard: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: _theme.colors.background.tertiary,
    borderRadius: _theme.spacing.borderRadius.sm,
    minWidth: 50,
  },
  phonemeSymbol: {
    fontSize: 18,
    fontWeight: '600',
  },
  phonemeScore: {
    fontSize: 12,
    marginTop: 4,
  },

  // 单词区域
  wordsSection: {
    padding: 16,
    borderRadius: _theme.spacing.borderRadius.base,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  wordsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  wordContainer: {
    alignItems: 'center',
    marginRight: 4,
    marginBottom: 8,
  },
  wordText: {
    fontSize: 18,
    fontWeight: '600',
  },
  scoreText: {
    fontSize: 12,
    marginTop: 2,
  },
  errorText: {
    fontSize: 10,
    marginTop: 2,
  },
  phonemesContainer: {
    flexDirection: 'row',
    marginTop: 4,
  },
  phonemeItem: {
    marginHorizontal: 2,
  },
  phonemeText: {
    fontSize: 12,
  },

  // 识别结果
  recognizedSection: {
    padding: 16,
    borderRadius: _theme.spacing.borderRadius.base,
  },
  recognizedText: {
    fontSize: 14,
    lineHeight: 22,
  },

  // 简化版
  simpleWordsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  simpleWordText: {
    fontSize: 20,
    fontWeight: '600',
  },
});

export default PronunciationFeedback;
