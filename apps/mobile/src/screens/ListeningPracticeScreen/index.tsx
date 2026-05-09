import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import Icon, { IconNames } from '@/components/Icon';
import { useListeningPractice, SPEED_OPTIONS } from './useListeningPractice';
import { createStyles } from './styles';

export default function ListeningPracticeScreen() {
  const { theme } = useTheme();
  const { t, effectiveLanguage: locale } = useI18n();
  const styles = createStyles(theme);
  const practice = useListeningPractice();

  if (practice.isLoading || !practice.material) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={practice.goBack} style={styles.backButton}>
            <Icon name={IconNames.left} size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('listening.practice')}</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const { sentences, questions } = practice;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={practice.goBack} style={styles.backButton}>
          <Icon name={IconNames.left} size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {locale === 'zh-CN' && practice.material.titleZh ? practice.material.titleZh : practice.material.title}
        </Text>
        <View style={styles.backButton} />
      </View>

      {/* 模式切换 */}
      <View style={styles.modeTabs}>
        <TouchableOpacity
          style={[styles.modeTab, practice.mode === 'dictation' && styles.modeTabActive]}
          onPress={() => practice.switchMode('dictation')}
        >
          <Icon name="edit" size={16} color={practice.mode === 'dictation' ? theme.colors.primary : theme.colors.text.secondary} />
          <Text style={[styles.modeTabText, practice.mode === 'dictation' && styles.modeTabTextActive]}>
            {t('listening.dictation')}
          </Text>
        </TouchableOpacity>
        {questions.length > 0 && (
          <TouchableOpacity
            style={[styles.modeTab, practice.mode === 'comprehension' && styles.modeTabActive]}
            onPress={() => practice.switchMode('comprehension')}
          >
            <Icon name="quiz" size={16} color={practice.mode === 'comprehension' ? theme.colors.primary : theme.colors.text.secondary} />
            <Text style={[styles.modeTabText, practice.mode === 'comprehension' && styles.modeTabTextActive]}>
              {t('listening.comprehension')}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 语速控制 */}
      <View style={styles.speedBar}>
        <Text style={styles.speedLabel}>{t('listening.speed')}</Text>
        <View style={styles.speedOptions}>
          {SPEED_OPTIONS.map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.speedButton, practice.speed === s && styles.speedButtonActive]}
              onPress={() => practice.setSpeed(s)}
            >
              <Text style={[styles.speedButtonText, practice.speed === s && styles.speedButtonTextActive]}>
                {s}x
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {practice.mode === 'dictation' ? (
          /* ===== 精听模式 ===== */
          practice.isDictationDone ? (
            <View style={styles.resultContainer}>
              <Icon name={IconNames.check} size={48} color={theme.colors.success} />
              <Text style={styles.resultTitle}>{t('listening.dictationDone')}</Text>
              <Text style={styles.resultDesc}>
                {t('listening.dictationResult', {
                  correct: practice.dictationResults.filter(Boolean).length,
                  total: sentences.length,
                })}
              </Text>
              <TouchableOpacity style={styles.primaryButton} onPress={practice.goBack}>
                <Text style={styles.primaryButtonText}>{t('listening.back')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              {/* 进度 */}
              <Text style={styles.progressText}>
                {practice.currentSentenceIndex + 1} / {sentences.length}
              </Text>

              {/* 播放按钮 */}
              <TouchableOpacity style={styles.playButton} onPress={() => practice.playSentence()} activeOpacity={0.7}>
                <Icon name={practice.tts.isPlaying ? 'pause' : 'play-arrow'} size={40} color={theme.colors.text.inverse} />
              </TouchableOpacity>
              <Text style={styles.playHint}>{t('listening.tapToPlay')}</Text>

              {/* 输入区域 */}
              <TextInput
                style={styles.dictationInput}
                placeholder={t('listening.typeWhatYouHear')}
                placeholderTextColor={theme.colors.text.disabled}
                value={practice.userInput}
                onChangeText={practice.setUserInput}
                multiline
                autoCapitalize="none"
                autoCorrect={false}
                editable={!practice.showAnswer}
              />

              {/* 答案展示 */}
              {practice.showAnswer && (
                <View style={styles.answerSection}>
                  <Text style={styles.answerLabel}>{t('listening.correctAnswer')}</Text>
                  <Text style={styles.answerText}>{sentences[practice.currentSentenceIndex].en}</Text>
                  <Text style={styles.translationText}>{sentences[practice.currentSentenceIndex].zh}</Text>
                </View>
              )}

              {/* 操作按钮 */}
              <View style={styles.actionRow}>
                {!practice.showAnswer ? (
                  <TouchableOpacity
                    style={[styles.primaryButton, !practice.userInput.trim() && styles.primaryButtonDisabled]}
                    onPress={practice.checkDictation}
                    disabled={!practice.userInput.trim()}
                  >
                    <Text style={styles.primaryButtonText}>{t('listening.checkAnswer')}</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.primaryButton} onPress={practice.nextSentence}>
                    <Text style={styles.primaryButtonText}>
                      {practice.currentSentenceIndex < sentences.length - 1
                        ? t('listening.nextSentence')
                        : t('listening.finish')}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )
        ) : (
          /* ===== 泛听模式 ===== */
          <View>
            {/* 全文播放按钮 */}
            <TouchableOpacity style={styles.playButton} onPress={practice.playAll} activeOpacity={0.7}>
              <Icon name={practice.tts.isPlaying ? 'pause' : 'play-arrow'} size={40} color={theme.colors.text.inverse} />
            </TouchableOpacity>
            <Text style={styles.playHint}>{t('listening.tapToPlayAll')}</Text>

            {/* 理解题 */}
            {questions.map((q, qIndex) => (
              <View key={qIndex} style={styles.questionCard}>
                <Text style={styles.questionNumber}>Q{qIndex + 1}</Text>
                <Text style={styles.questionText}>
                  {locale === 'zh-CN' ? q.questionZh : q.question}
                </Text>
                {q.options.map((option, oIndex) => {
                  const isSelected = practice.selectedAnswers[qIndex] === oIndex;
                  const isCorrectOption = practice.showQuizResults && oIndex === q.answer;
                  let optionStyle = styles.optionButton;
                  let optionTextStyle = styles.optionText;
                  if (practice.showQuizResults) {
                    if (isCorrectOption) {
                      optionStyle = { ...styles.optionButton, ...styles.optionCorrect };
                      optionTextStyle = { ...styles.optionText, ...styles.optionTextCorrect };
                    } else if (isSelected && !isCorrectOption) {
                      optionStyle = { ...styles.optionButton, ...styles.optionWrong };
                      optionTextStyle = { ...styles.optionText, ...styles.optionTextWrong };
                    }
                  } else if (isSelected) {
                    optionStyle = { ...styles.optionButton, ...styles.optionSelected };
                    optionTextStyle = { ...styles.optionText, ...styles.optionTextSelected };
                  }

                  return (
                    <TouchableOpacity
                      key={oIndex}
                      style={optionStyle}
                      onPress={() => practice.selectAnswer(qIndex, oIndex)}
                      disabled={practice.showQuizResults}
                    >
                      <Text style={optionTextStyle}>{String.fromCharCode(65 + oIndex)}. {option}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}

            {/* 提交 / 结果 */}
            {!practice.showQuizResults ? (
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  Object.keys(practice.selectedAnswers).length < questions.length && styles.primaryButtonDisabled,
                ]}
                onPress={practice.submitQuiz}
                disabled={Object.keys(practice.selectedAnswers).length < questions.length}
              >
                <Text style={styles.primaryButtonText}>{t('listening.submitQuiz')}</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.resultContainer}>
                <Text style={styles.resultTitle}>{t('listening.quizDone')}</Text>
                <Text style={styles.resultDesc}>
                  {t('listening.quizResult', {
                    correct: questions.filter((q, i) => practice.selectedAnswers[i] === q.answer).length,
                    total: questions.length,
                  })}
                </Text>
                <TouchableOpacity style={styles.primaryButton} onPress={practice.goBack}>
                  <Text style={styles.primaryButtonText}>{t('listening.back')}</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={{ height: 40 }} />
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
