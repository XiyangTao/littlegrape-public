import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import { useNavigation } from '@react-navigation/native';
import Icon, { IconNames } from '@/components/Icon';
import { useExamPractice } from './useExamPractice';
import { createStyles } from './styles';

export default function ExamPracticeScreen() {
  const { theme } = useTheme();
  const { t, effectiveLanguage: locale } = useI18n();
  const navigation = useNavigation<any>();
  const styles = createStyles(theme);

  const {
    phase,
    exam,
    currentIndex,
    selectedOption,
    showFeedback,
    timeElapsed,
    score,
    correctCount,
    startExam,
    handleSelectOption,
    handleRetry,
    formatTime,
  } = useExamPractice();

  // ==================== 加载中 ====================
  if (phase === 'loading' || !exam) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{t('exam.generating')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ==================== 介绍页 ====================
  if (phase === 'intro') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name={IconNames.left} size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {locale === 'zh-CN' ? exam.examType.nameZh : exam.examType.name}
          </Text>
          <View style={styles.backButton} />
        </View>

        <View style={styles.introContent}>
          <View style={styles.introIconWrap}>
            <Icon name="quiz" size={48} color={theme.colors.primary} />
          </View>
          <Text style={styles.introTitle}>{t('exam.mockExam')}</Text>
          <Text style={styles.introDesc}>
            {locale === 'zh-CN' ? exam.examType.descriptionZh : exam.examType.description}
          </Text>

          <View style={styles.introStats}>
            <View style={styles.introStatItem}>
              <Text style={styles.introStatValue}>{exam.totalQuestions}</Text>
              <Text style={styles.introStatLabel}>{t('exam.questions')}</Text>
            </View>
            <View style={styles.introStatItem}>
              <Text style={styles.introStatValue}>{exam.timeLimit}</Text>
              <Text style={styles.introStatLabel}>{t('exam.minutes')}</Text>
            </View>
            <View style={styles.introStatItem}>
              <Text style={styles.introStatValue}>{exam.examType.sections.length}</Text>
              <Text style={styles.introStatLabel}>{t('exam.sections')}</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.startButton} onPress={startExam}>
            <Text style={styles.startButtonText}>{t('exam.startExam')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ==================== 答题中 ====================
  if (phase === 'testing') {
    const question = exam.questions[currentIndex];
    const progress = ((currentIndex + 1) / exam.questions.length) * 100;

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.testHeader}>
          <TouchableOpacity onPress={() => {
            Alert.alert(t('exam.quitTitle'), t('exam.quitMessage'), [
              { text: t('common.cancel') },
              { text: t('common.confirm'), onPress: () => navigation.goBack() },
            ]);
          }}>
            <Icon name="close" size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.timerText}>{formatTime(timeElapsed)}</Text>
          <Text style={styles.progressLabel}>{currentIndex + 1}/{exam.questions.length}</Text>
        </View>

        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
        </View>

        <ScrollView style={styles.testContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionLabel}>{question.section}</Text>

          {question.type === 'vocabulary' ? (
            <View style={styles.questionWrap}>
              <Text style={styles.questionWord}>{question.question}</Text>
              <Text style={styles.questionHint}>{t('exam.selectMeaning')}</Text>
            </View>
          ) : (
            <View style={styles.questionWrap}>
              <Text style={styles.questionSentence}>{question.question}</Text>
              <Text style={styles.questionHint}>{t('exam.fillBlank')}</Text>
            </View>
          )}

          <View style={styles.optionsContainer}>
            {question.options.map((option, index) => {
              let optionStyle = styles.optionButton;
              if (showFeedback) {
                if (index === question.answer) {
                  optionStyle = { ...styles.optionButton, ...styles.optionCorrect };
                } else if (index === selectedOption && index !== question.answer) {
                  optionStyle = { ...styles.optionButton, ...styles.optionWrong };
                }
              } else if (index === selectedOption) {
                optionStyle = { ...styles.optionButton, ...styles.optionSelected };
              }

              return (
                <TouchableOpacity
                  key={index}
                  style={optionStyle}
                  onPress={() => handleSelectOption(index)}
                  disabled={showFeedback}
                >
                  <View style={styles.optionIndex}>
                    <Text style={styles.optionIndexText}>
                      {String.fromCharCode(65 + index)}
                    </Text>
                  </View>
                  <Text style={styles.optionText}>{option}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ==================== 结果页 ====================
  const scoreColor = score >= 80 ? theme.colors.success : score >= 60 ? theme.colors.warning : theme.colors.error;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.resultContainer}>
        <View style={[styles.scoreCircle, { borderColor: scoreColor }]}>
          <Text style={[styles.scoreValue, { color: scoreColor }]}>{score}</Text>
          <Text style={styles.scoreUnit}>%</Text>
        </View>

        <Text style={styles.resultTitle}>
          {score >= 80 ? t('exam.excellent') : score >= 60 ? t('exam.good') : t('exam.needsWork')}
        </Text>

        <View style={styles.resultStats}>
          <View style={styles.resultStatItem}>
            <Text style={styles.resultStatValue}>{correctCount}</Text>
            <Text style={styles.resultStatLabel}>{t('exam.correct')}</Text>
          </View>
          <View style={styles.resultStatItem}>
            <Text style={styles.resultStatValue}>{exam.questions.length - correctCount}</Text>
            <Text style={styles.resultStatLabel}>{t('exam.wrong')}</Text>
          </View>
          <View style={styles.resultStatItem}>
            <Text style={styles.resultStatValue}>{formatTime(timeElapsed)}</Text>
            <Text style={styles.resultStatLabel}>{t('exam.time')}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
          <Icon name="replay" size={20} color={theme.colors.text.inverse} />
          <Text style={styles.retryButtonText}>{t('exam.retry')}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.backButtonLarge} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonLargeText}>{t('exam.backToList')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
