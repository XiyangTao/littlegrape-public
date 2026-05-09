/**
 * 每日挑战赛页面
 * 三个阶段：大厅 → 答题 → 结果
 */
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from '@/components/Icon';
import { useTheme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import { MEDAL_COLORS } from '@/constants/colors';
import { useDailyChallenge } from './useDailyChallenge';
import { createStyles } from './styles';

// ==================== 主组件 ====================

export default function DailyChallengeScreen() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const styles = createStyles(theme);
  const hook = useDailyChallenge();

  if (hook.isLoading && hook.phase === 'lobby') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>{t('dailyChallenge.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (hook.phase === 'lobby') return renderLobby();
  if (hook.phase === 'playing') return renderPlaying();
  return renderResult();

  // ==================== Lobby 阶段 ====================

  function renderLobby() {
    const { challenge, myStats, leaderboard, myRank, alreadyPlayed, handleStartChallenge, navigation } = hook;

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.lobbyHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.lobbyHeaderTitle}>{t('dailyChallenge.title')}</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.lobbyContainer} contentContainerStyle={styles.lobbyContent}>
          {/* 挑战信息卡片 */}
          {challenge && (
            <View style={styles.challengeCard}>
              <Text style={styles.challengeDate}>{challenge.date}</Text>
              <Text style={styles.challengeTitle}>{t('dailyChallenge.todayChallenge')}</Text>
              <View style={styles.challengeInfo}>
                <View style={styles.challengeInfoItem}>
                  <Text style={styles.challengeInfoValue}>{challenge.totalQuestions}</Text>
                  <Text style={styles.challengeInfoLabel}>{t('dailyChallenge.questionCount')}</Text>
                </View>
                <View style={styles.challengeInfoItem}>
                  <Text style={styles.challengeInfoValue}>{t('dailyChallenge.timeLimitValue', { min: Math.floor(challenge.timeLimit / 60) })}</Text>
                  <Text style={styles.challengeInfoLabel}>{t('dailyChallenge.timeLimit')}</Text>
                </View>
              </View>
            </View>
          )}

          {/* 开始按钮 */}
          <TouchableOpacity
            onPress={handleStartChallenge}
            disabled={!challenge || alreadyPlayed}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={alreadyPlayed ? [theme.colors.text.disabled, theme.colors.text.disabled] : theme.colors.gradient.primary}
              style={[styles.startButton, (!challenge || alreadyPlayed) && styles.disabledButton]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.startButtonText}>
                {alreadyPlayed ? t('dailyChallenge.alreadyPlayed') : t('dailyChallenge.startChallenge')}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {alreadyPlayed && myRank && (
            <Text style={styles.alreadyPlayedText}>
              {t('dailyChallenge.alreadyPlayedRank', { rank: myRank })}
            </Text>
          )}

          {/* 我的统计 */}
          {myStats && (
            <View style={styles.statsSection}>
              <Text style={styles.sectionTitle}>{t('dailyChallenge.myStats')}</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{myStats.totalDays}</Text>
                  <Text style={styles.statLabel}>{t('dailyChallenge.statDays')}</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{myStats.bestScore}</Text>
                  <Text style={styles.statLabel}>{t('dailyChallenge.statBest')}</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{Math.round(myStats.avgScore)}</Text>
                  <Text style={styles.statLabel}>{t('dailyChallenge.statAvg')}</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{myStats.currentStreak}</Text>
                  <Text style={styles.statLabel}>{t('dailyChallenge.statStreak')}</Text>
                </View>
              </View>
            </View>
          )}

          {/* 排行榜 */}
          {leaderboard.length > 0 && (
            <View style={styles.leaderboardSection}>
              <Text style={styles.sectionTitle}>{t('dailyChallenge.leaderboard')}</Text>
              {leaderboard.map((entry, idx) => (
                <View
                  key={entry.userId}
                  style={[
                    styles.leaderboardItem,
                    entry.userId === hook.challenge?.id && styles.leaderboardItemHighlight,
                  ]}
                >
                  {idx < 3 ? (
                    <View style={[styles.rankBadge, { backgroundColor: MEDAL_COLORS[idx] }]}>
                      <Text style={styles.rankText}>{idx + 1}</Text>
                    </View>
                  ) : (
                    <Text style={styles.rankTextNormal}>{idx + 1}</Text>
                  )}
                  <Text style={styles.leaderboardName} numberOfLines={1}>
                    {entry.nickname || t('dailyChallenge.anonymous')}
                  </Text>
                  <Text style={styles.leaderboardScore}>{entry.score}</Text>
                </View>
              ))}
              {myRank && myRank > 10 && (
                <Text style={styles.myRankText}>{t('dailyChallenge.myRank', { rank: myRank })}</Text>
              )}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ==================== Playing 阶段 ====================

  function renderPlaying() {
    const {
      currentIndex, currentQuestion, score, combo, feedbackState,
      selectedIndex, overallTimeLeft, handleAnswer, challenge,
    } = hook;

    if (!currentQuestion || !challenge) return null;

    const timeSeconds = Math.ceil(overallTimeLeft / 1000);
    const minutes = Math.floor(timeSeconds / 60);
    const seconds = timeSeconds % 60;
    const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    const isTimeWarning = timeSeconds <= 60;
    const progress = (currentIndex + 1) / challenge.totalQuestions;

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.playingContainer}>
          {/* Header: 计时器 + 分数 + 进度 */}
          <View style={styles.playingHeader}>
            <View style={styles.timerContainer}>
              <Icon name="timer" size={20} color={isTimeWarning ? theme.colors.error : theme.colors.text.primary} />
              <Text style={[styles.timerText, isTimeWarning && styles.timerTextWarning]}>
                {timeStr}
              </Text>
            </View>
            <Text style={styles.scoreText}>{score}</Text>
            <Text style={styles.progressText}>{currentIndex + 1}/{challenge.totalQuestions}</Text>
          </View>

          {/* 进度条 */}
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
          </View>

          {/* Combo */}
          {combo > 1 && (
            <View style={styles.comboContainer}>
              <Text style={styles.comboText}>{t('dailyChallenge.combo', { count: combo })}</Text>
            </View>
          )}

          {/* 题目区域 */}
          <View style={styles.questionCard}>
            {/* 题型标签 */}
            <View style={styles.questionTypeBadge}>
              <Text style={styles.questionTypeText}>
                {t(`dailyChallenge.qtype.${currentQuestion.type}`, { defaultValue: currentQuestion.type })}
              </Text>
            </View>

            {/* 题目内容 */}
            {renderQuestionPrompt()}

            {/* 选项 */}
            <View style={styles.optionsContainer}>
              {currentQuestion.options.map((option, idx) => {
                const isSelected = selectedIndex === idx;
                const isCorrect = feedbackState && idx === currentQuestion.correctIndex;
                const isWrong = feedbackState === 'wrong' && isSelected;

                return (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.optionButton,
                      isSelected && !feedbackState && styles.optionButtonSelected,
                      isCorrect && styles.optionButtonCorrect,
                      isWrong && styles.optionButtonWrong,
                    ]}
                    onPress={() => handleAnswer(idx)}
                    disabled={!!feedbackState}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        isCorrect && styles.optionTextCorrect,
                        isWrong && styles.optionTextWrong,
                      ]}
                    >
                      {option}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  function renderQuestionPrompt() {
    const { currentQuestion } = hook;
    if (!currentQuestion) return null;

    switch (currentQuestion.type) {
      case 'meaningChoice':
        return (
          <>
            <Text style={styles.questionPrompt}>{currentQuestion.word}</Text>
            <Text style={styles.questionSubPrompt}>{t('dailyChallenge.prompt.meaningChoice')}</Text>
          </>
        );
      case 'wordChoice':
        return (
          <>
            <Text style={styles.questionPrompt}>{currentQuestion.meaningCn}</Text>
            <Text style={styles.questionSubPrompt}>{t('dailyChallenge.prompt.wordChoice')}</Text>
          </>
        );
      case 'listenChoice':
        return (
          <>
            <TouchableOpacity style={styles.listenButton}>
              <Icon name="volume-up" size={32} color={theme.colors.text.inverse} />
            </TouchableOpacity>
            <Text style={styles.questionSubPrompt}>{t('dailyChallenge.prompt.listenChoice')}</Text>
          </>
        );
      case 'sentenceFill':
        return (
          <>
            <Text style={styles.sentenceText}>
              {currentQuestion.sentence || '______'}
            </Text>
            <Text style={styles.questionSubPrompt}>{t('dailyChallenge.prompt.sentenceFill')}</Text>
          </>
        );
      default:
        return (
          <>
            <Text style={styles.questionPrompt}>{currentQuestion.word}</Text>
            <Text style={styles.questionSubPrompt}>{t('dailyChallenge.prompt.default')}</Text>
          </>
        );
    }
  }

  // ==================== Result 阶段 ====================

  function renderResult() {
    const { score, correctCount, maxCombo, challenge, myRank, navigation } = hook;
    const totalQuestions = challenge?.totalQuestions || 0;
    const accuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    // 根据正确率选择表情
    let emoji = '\uD83C\uDF89'; // 🎉
    let titleKey = 'dailyChallenge.result.titleExcellent';
    if (accuracy < 50) {
      emoji = '\uD83D\uDCAA'; // 💪
      titleKey = 'dailyChallenge.result.titleKeepGoing';
    } else if (accuracy < 80) {
      emoji = '\uD83D\uDE0A'; // 😊
      titleKey = 'dailyChallenge.result.titleGood';
    }

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.resultContainer}>
          <View style={styles.resultContent}>
            <Text style={styles.resultEmoji}>{emoji}</Text>
            <Text style={styles.resultTitle}>{t(titleKey)}</Text>
            <Text style={styles.resultScore}>{score}</Text>

            <View style={styles.resultStatsRow}>
              <View style={styles.resultStatItem}>
                <Text style={styles.resultStatValue}>{correctCount}/{totalQuestions}</Text>
                <Text style={styles.resultStatLabel}>{t('dailyChallenge.result.accuracy', { pct: accuracy })}</Text>
              </View>
              <View style={styles.resultStatItem}>
                <Text style={styles.resultStatValue}>{maxCombo}x</Text>
                <Text style={styles.resultStatLabel}>{t('dailyChallenge.result.maxCombo')}</Text>
              </View>
            </View>

            {myRank && (
              <View style={styles.rankCard}>
                <Text style={styles.rankTitle}>{t('dailyChallenge.result.todayRank')}</Text>
                <Text style={styles.rankValue}>{t('dailyChallenge.result.rankValue', { rank: myRank })}</Text>
              </View>
            )}
          </View>

          <View style={styles.resultButtons}>
            <TouchableOpacity
              onPress={async () => {
                try {
                  await Share.share({
                    message: myRank
                      ? t('dailyChallenge.result.shareWithRank', { score, rank: myRank, accuracy, maxCombo })
                      : t('dailyChallenge.result.shareNoRank', { score, accuracy, maxCombo }),
                  });
                } catch {}
              }}
              activeOpacity={0.8}
            >
              <View style={styles.resultButtonSecondary}>
                <Text style={styles.resultButtonSecondaryText}>{t('dailyChallenge.result.share')}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.8}>
              <LinearGradient
                colors={theme.colors.gradient.primary}
                style={styles.resultButtonPrimary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.resultButtonPrimaryText}>{t('dailyChallenge.result.back')}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }
}
