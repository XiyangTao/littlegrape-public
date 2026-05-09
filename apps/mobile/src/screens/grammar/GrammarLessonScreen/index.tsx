import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '@/components/Icon';
import { useTheme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import { useGrammarLesson } from './useGrammarLesson';
import {
  SmartTip,
  ErrorJudgmentQuiz,
  ErrorCorrectionQuiz,
  DualBlankQuiz,
  TableFillQuiz,
  SentenceReorderQuiz,
  WordAssemblyQuiz,
} from './components';
import createStyles from './styles';
import type { LessonQuestion, StructuredExplanation } from '@/api/modules/grammar';

export default function GrammarLessonScreen() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const styles = createStyles(theme);

  const {
    point,
    explanation,
    isLoading,
    stage,
    totalSteps,
    currentStep,
    currentQuestion,
    currentQuestionIdx,
    allQuestions,
    getQuestionTypeLabel,
    selectedAnswer,
    isAnswered,
    isCorrect,
    isFinished,
    result,
    needsManualSubmit,
    needsAssemblySubmit,
    showSmartTip,
    currentSmartTip,
    showTipsModal,
    handleSelectOption,
    handleSubmit,
    handleNext,
    handleRetry,
    handleDone,
    handleCloseSmartTip,
    handleStartQuiz,
    handleShowTips,
    handleCloseTips,
    error,
  } = useGrammarLesson();

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top', 'bottom']}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  // 加载失败或 quiz 阶段无题目
  if (error || (stage === 'quiz' && !currentQuestion)) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.loadingContainer}>
          <Icon name="error-outline" size={48} color={theme.colors.text.disabled} />
          <Text style={[styles.resultTitle, { marginTop: 16 }]}>{t('learn.loadFailed')}</Text>
          <TouchableOpacity style={[styles.nextButton, { marginTop: 24, paddingHorizontal: 48 }]} onPress={handleDone}>
            <Text style={styles.nextButtonText}>{t('learn.backToGrammar')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // 结果页
  if (isFinished && result) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <ResultView
          result={result}
          onRetry={handleRetry}
          onDone={handleDone}
          styles={styles}
          theme={theme}
          t={t}
        />
      </SafeAreaView>
    );
  }

  const progress = totalSteps > 0 ? (stage === 'tips' ? 0 : currentStep / totalSteps) : 0;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* 顶部进度条 */}
      <View style={styles.progressHeader}>
        <View style={styles.progressRow}>
          <TouchableOpacity style={styles.closeButton} onPress={handleDone}>
            <Icon name="close" size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progress * 100}%` as any }]} />
          </View>
          {stage === 'quiz' && explanation && (
            <TouchableOpacity style={styles.tipsButton} onPress={handleShowTips}>
              <Icon name="lightbulb" size={20} color={theme.colors.warning} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 内容区域 */}
      <ScrollView style={styles.contentSection} showsVerticalScrollIndicator={false}>
        {/* Tips 初始页面 */}
        {stage === 'tips' && explanation && (
          <>
            <GrammarTipsCard explanation={explanation} point={point} styles={styles} />
            <Text style={{ fontSize: 10, color: theme.colors.text.disabled, textAlign: 'center', marginTop: 8 }}>
              {t('common.aiGenerated')}
            </Text>
          </>
        )}

        {/* 练习流 */}
        {stage === 'quiz' && currentQuestion && (
          <QuestionView
            key={currentQuestionIdx}
            question={currentQuestion}
            selectedAnswer={selectedAnswer}
            isAnswered={isAnswered}
            isCorrect={isCorrect}
            onSelect={handleSelectOption}
            getQuestionTypeLabel={getQuestionTypeLabel}
            styles={styles}
            theme={theme}
            t={t}
          />
        )}

        <View style={{ height: 16 }} />
      </ScrollView>

      {/* 底部按钮 */}
      <View style={styles.bottomBar}>
        {stage === 'tips' ? (
          <TouchableOpacity style={styles.nextButton} onPress={handleStartQuiz} activeOpacity={0.8}>
            <Text style={styles.nextButtonText}>{t('learn.startPractice')}</Text>
          </TouchableOpacity>
        ) : !isAnswered ? (
          <>
            {(needsManualSubmit || needsAssemblySubmit) && (
              <TouchableOpacity
                style={[styles.nextButton, !selectedAnswer && styles.nextButtonDisabled]}
                onPress={handleSubmit}
                activeOpacity={0.8}
                disabled={!selectedAnswer}
              >
                <Text style={styles.nextButtonText}>{t('learn.submitAnswer')}</Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <TouchableOpacity style={styles.nextButton} onPress={handleNext} activeOpacity={0.8}>
            <Text style={styles.nextButtonText}>
              {currentQuestionIdx >= allQuestions.length - 1
                ? t('learn.practiceResult')
                : t('learn.nextQuestion')}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Smart Tip */}
      {currentSmartTip && (
        <SmartTip
          tip={currentSmartTip}
          visible={showSmartTip}
          onClose={handleCloseSmartTip}
          styles={styles}
          theme={theme}
        />
      )}

      {/* Tips Modal */}
      {explanation && (
        <Modal visible={showTipsModal} transparent animationType="slide">
          <TouchableOpacity
            style={styles.tipsModalOverlay}
            activeOpacity={1}
            onPress={handleCloseTips}
          >
            <View style={styles.tipsModalContent} onStartShouldSetResponder={() => true}>
              <View style={styles.tipsModalHeader}>
                <Text style={styles.tipsModalTitle}>{t('learn.grammarTips')}</Text>
                <TouchableOpacity onPress={handleCloseTips}>
                  <Icon name="close" size={22} color={theme.colors.text.secondary} />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                <GrammarTipsCard explanation={explanation} point={point} styles={styles} />
                <Text style={{ fontSize: 10, color: theme.colors.text.disabled, textAlign: 'center', marginTop: 8, paddingBottom: 12 }}>
                  {t('common.aiGenerated')}
                </Text>
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </SafeAreaView>
  );
}

// ==================== Grammar Tips Card ====================

function GrammarTipsCard({
  explanation, point, styles,
}: {
  explanation: StructuredExplanation;
  point: any;
  styles: any;
}) {
  const sections = explanation?.sections;
  if (!sections) return null;

  return (
    <View style={styles.ruleCard}>
      <Text style={styles.ruleTitle}>{point?.nameZh || ''}</Text>
      <Text style={styles.ruleDefinition}>{sections.definition}</Text>

      {sections.structure && (
        <View style={styles.tipsStructureBox}>
          <Text style={styles.tipsStructureText}>{sections.structure}</Text>
        </View>
      )}

      {sections.examples?.slice(0, 2).map((ex: any, i: number) => {
        if (typeof ex === 'string') {
          return (
            <View key={i} style={styles.ruleExample}>
              <Text style={styles.ruleExampleEn}>{ex}</Text>
            </View>
          );
        }
        return (
          <View key={i} style={styles.ruleExample}>
            <Text style={styles.ruleExampleEn}>{ex.en || ex.sentence}</Text>
            <Text style={styles.ruleExampleCn}>{ex.cn || ex.translation}</Text>
          </View>
        );
      })}

      {sections.commonErrors?.[0] && (
        <View style={styles.errorCard}>
          <Text style={styles.errorWrong}>✗ {sections.commonErrors[0].wrong}</Text>
          <Text style={styles.errorCorrect}>✓ {sections.commonErrors[0].correct}</Text>
          {sections.commonErrors[0].explanation && (
            <Text style={styles.errorExplanation}>{sections.commonErrors[0].explanation}</Text>
          )}
        </View>
      )}
    </View>
  );
}

// ==================== Question View ====================

function QuestionView({
  question, selectedAnswer, isAnswered, isCorrect, onSelect, getQuestionTypeLabel, styles, theme, t,
}: {
  question: LessonQuestion;
  selectedAnswer: string | null;
  isAnswered: boolean;
  isCorrect: boolean;
  onSelect: (answer: string) => void;
  getQuestionTypeLabel: (type: string) => string;
  styles: any;
  theme: any;
  t: (key: string) => string;
}) {
  const commonProps = { question, selectedAnswer, isAnswered, isCorrect, onSelect, styles, theme };

  switch (question.type) {
    case 'error_judgment':
      return <ErrorJudgmentQuiz {...commonProps} />;

    case 'error_correction':
      return <ErrorCorrectionQuiz {...commonProps} />;

    case 'dual_blank':
      return <DualBlankQuiz {...commonProps} />;

    case 'table_fill':
      return <TableFillQuiz {...commonProps} />;

    case 'sentence_reorder':
      return <SentenceReorderQuiz {...commonProps} />;

    case 'word_assembly':
      return <WordAssemblyQuiz {...commonProps} />;

    case 'choice':
      return (
        <View>
          <Text style={styles.questionType}>{t(getQuestionTypeLabel('choice'))}</Text>
          <Text style={styles.questionText}>{question.question}</Text>
          <ChoiceOptions
            options={question.options || []}
            selectedAnswer={selectedAnswer}
            correctAnswer={question.answer}
            isAnswered={isAnswered}
            isCorrect={isCorrect}
            onSelect={onSelect}
            styles={styles}
            theme={theme}
            t={t}
            explanation={question.explanation}
          />
        </View>
      );

    case 'fill_blank':
      return (
        <View>
          <Text style={styles.questionType}>{t(getQuestionTypeLabel('fill_blank'))}</Text>
          <Text style={styles.questionText}>{question.question}</Text>
          <WordBank
            options={question.options || []}
            selectedAnswer={selectedAnswer}
            correctAnswer={question.answer}
            isAnswered={isAnswered}
            isCorrect={isCorrect}
            onSelect={onSelect}
            styles={styles}
            theme={theme}
            t={t}
            explanation={question.explanation}
          />
        </View>
      );

    default:
      return null;
  }
}

// ==================== Choice Options ====================

function ChoiceOptions({
  options, selectedAnswer, correctAnswer, isAnswered, isCorrect, onSelect, styles, theme, t, explanation,
}: {
  options: string[];
  selectedAnswer: string | null;
  correctAnswer: string;
  isAnswered: boolean;
  isCorrect: boolean;
  onSelect: (option: string) => void;
  styles: any;
  theme: any;
  t: (key: string) => string;
  explanation: string;
}) {
  return (
    <View>
      {options.map((option) => {
        const isSelected = selectedAnswer === option;
        const isCorrectOption = option === correctAnswer;

        let optionStyle = [styles.optionButton];
        if (isAnswered) {
          if (isCorrectOption) optionStyle.push(styles.optionCorrect);
          else if (isSelected && !isCorrectOption) optionStyle.push(styles.optionIncorrect);
        } else if (isSelected) {
          optionStyle.push(styles.optionSelected);
        }

        return (
          <TouchableOpacity
            key={option}
            style={optionStyle}
            onPress={() => onSelect(option)}
            activeOpacity={0.7}
            disabled={isAnswered}
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
            <Text style={styles.correctAnswer}>{t('learn.correct')}: {correctAnswer}</Text>
          )}
          <Text style={styles.explanationText}>{explanation}</Text>
        </View>
      )}
    </View>
  );
}

// ==================== Word Bank ====================

function WordBank({
  options, selectedAnswer, correctAnswer, isAnswered, isCorrect, onSelect, styles, theme, t, explanation,
}: {
  options: string[];
  selectedAnswer: string | null;
  correctAnswer: string;
  isAnswered: boolean;
  isCorrect: boolean;
  onSelect: (option: string) => void;
  styles: any;
  theme: any;
  t: (key: string) => string;
  explanation: string;
}) {
  return (
    <View>
      <View style={styles.wordBankContainer}>
        {options.map((option) => {
          const isSelected = selectedAnswer === option;
          const isCorrectOption = option === correctAnswer;

          let chipStyle = [styles.wordChip];
          let textStyle = [styles.wordChipText];
          if (isAnswered) {
            if (isCorrectOption) {
              chipStyle.push(styles.wordChipCorrect);
              textStyle.push(styles.wordChipTextCorrect);
            } else if (isSelected && !isCorrectOption) {
              chipStyle.push(styles.wordChipIncorrect);
              textStyle.push(styles.wordChipTextIncorrect);
            }
          } else if (isSelected) {
            chipStyle.push(styles.wordChipSelected);
            textStyle.push(styles.wordChipTextSelected);
          }

          return (
            <TouchableOpacity
              key={option}
              style={chipStyle}
              onPress={() => onSelect(option)}
              activeOpacity={0.7}
              disabled={isAnswered}
            >
              <Text style={textStyle}>{option}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
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
            <Text style={styles.correctAnswer}>{t('learn.correct')}: {correctAnswer}</Text>
          )}
          <Text style={styles.explanationText}>{explanation}</Text>
        </View>
      )}
    </View>
  );
}

// ==================== Result View ====================

function ResultView({
  result, onRetry, onDone, styles, theme, t,
}: {
  result: { totalCount: number; correctCount: number; incorrectCount: number; score: number; starRating: number };
  onRetry: () => void;
  onDone: () => void;
  styles: any;
  theme: any;
  t: (key: string) => string;
}) {
  const starColor = theme.colors.warning;
  const emptyStarColor = theme.colors.border.light;

  return (
    <View style={styles.resultContainer}>
      {/* 星级 */}
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map(i => (
          <Icon
            key={i}
            name={i <= result.starRating ? 'star' : 'star-border'}
            size={36}
            color={i <= result.starRating ? starColor : emptyStarColor}
          />
        ))}
      </View>

      <Text style={styles.resultTitle}>{t('learn.lessonComplete')}</Text>
      <Text style={styles.resultSubtitle}>{result.score}{t('learn.score')}</Text>

      <View style={styles.resultStats}>
        <View style={styles.resultStatItem}>
          <Text style={[styles.resultStatValue, { color: theme.colors.success }]}>{result.correctCount}</Text>
          <Text style={styles.resultStatLabel}>{t('learn.correctCount')}</Text>
        </View>
        <View style={styles.resultStatItem}>
          <Text style={[styles.resultStatValue, { color: theme.colors.error }]}>{result.incorrectCount}</Text>
          <Text style={styles.resultStatLabel}>{t('learn.incorrectCount')}</Text>
        </View>
      </View>

      <View style={styles.resultButtons}>
        <TouchableOpacity style={styles.retryButton} onPress={onRetry} activeOpacity={0.7}>
          <Text style={styles.retryButtonText}>{t('learn.restartLesson')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.doneButton} onPress={onDone} activeOpacity={0.8}>
          <Text style={styles.doneButtonText}>{t('learn.backToGrammar')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
